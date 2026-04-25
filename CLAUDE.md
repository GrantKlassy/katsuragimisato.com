# katsuragimisato.com

Two things live in this repo:

1. **`main/`** --- the Astro website at [katsuragimisato.com](https://katsuragimisato.com), deployed via Cloudflare Workers Static Assets (see `wrangler.jsonc`). Source is in `main/src/`, build output is `main/dist/`.
2. **`ml/`** --- a multimodal Misato-on-screen detector trained on the show. Plan and pipeline are below.

The ML project is the active work. The website is stable.

## Misato Detector

### Goal

Train a model that, given a frame (and the audio around it) from Neon Genesis Evangelion, predicts whether **Misato Katsuragi** is currently on screen. The output for a full episode is a list of `MISATO START → MISATO END` spans.

### The data

- Source video: `assets/tv/Neon Genesis Evangelion (1995) {tvdb-70350}/Season 01/` --- 26 episodes, 1080p Bluray rips, FLAC 5.1 audio. ~106 GB total. **Never commit this directory** --- it's gitignored.
- The operator (Grant) hand-labels MISATO spans in a subset of episodes. The model is trained on those, then used to predict spans on the rest. The operator does not have time to label all 26 episodes by hand --- that's the entire point of the model.

### Label format

One YAML file per labeled episode at `ml/labels/S01E01.yml`:

```yaml
episode: S01E01
spans:
  - start: 00:01:23.500
    end:   00:02:45.000
  - start: 00:05:11.000
    end:   00:05:34.000
```

Timestamps are `HH:MM:SS.mmm`, relative to the start of the episode file (no offset for OP/ED --- a span that lands inside the OP is fine, that's still Misato on screen). Spans must be non-overlapping and in order. Anything in a labeled episode that is **not** inside a span is treated as a confirmed negative.

Episodes with no `ml/labels/<ep>.yml` file are unlabeled and are used only for inference / pseudo-labeling, never for training.

### Pipeline

Implement under `ml/` in PyTorch. Layout:

```
ml/
  labels/                  # operator-authored, one YAML per labeled episode
  features/                # cached embeddings (gitignored)
  models/                  # trained checkpoints (gitignored)
  predictions/             # model output, one YAML per inferred episode
  scripts/
    extract_features.py    # mkv -> per-second visual + audio embeddings
    build_dataset.py       # labels + features -> torch Dataset
    train.py               # training loop
    predict.py             # inference + span post-processing
```

#### 1. Feature extraction (`extract_features.py`)

Decode each MKV with `ffmpeg` / PyAV. Sample at **2 fps** (one frame every 500 ms --- fine-grained enough for Misato cuts, cheap enough to run on the whole show). For each sample point, produce two embeddings and cache them to disk keyed by `(episode, timestamp_ms)`:

- **Visual:** decode the frame, resize to the model's expected input, push through a frozen pretrained backbone. Default: **DINOv2 ViT-S/14** (`facebook/dinov2-small`) --- strong general visual features, small enough to run locally. CLIP ViT-B/16 is an acceptable alternative.
- **Audio:** extract a ~1 second window centered on the frame timestamp from the **Japanese audio track** (track 0 on these rips --- confirm with `ffprobe`; fall back to whichever track has Mitsuishi's voice, not the English dub). Resample to 16 kHz mono. Push through frozen **wav2vec2-base** features, mean-pool over time. Audio is a strong signal here: Misato is voiced by Kotono Mitsuishi and her voice is distinctive.

Cache features as `.npy` or a single per-episode `.npz`. Re-running the script must skip episodes whose feature cache already matches the source mkv mtime.

#### 2. Dataset (`build_dataset.py`)

For each labeled episode, walk every cached sample point and emit `(visual_emb, audio_emb, label)` where `label = 1` iff the timestamp falls inside a labeled span.

- **Split by episode**, not by frame --- frames within the same episode are highly correlated and a frame-level split leaks. Hold out 2–3 labeled episodes as validation.
- **Class imbalance** is real: Misato is on screen maybe 20–40% of any given episode. Use `pos_weight` in BCE rather than resampling, so the model still sees natural temporal structure.

#### 3. Model (`train.py`)

Start small --- frozen backbones, train only the head:

```
visual_emb (384-d DINOv2-small)  ─┐
                                  ├─→ concat → MLP(512 → 128 → 1) → sigmoid
audio_emb  (768-d wav2vec2-base) ─┘
```

- Loss: `BCEWithLogitsLoss(pos_weight=...)`.
- Optimizer: AdamW, lr 1e-3 on the head.
- Train on a single GPU if available, CPU if not --- features are precomputed so training is cheap (it's just an MLP).
- Save best checkpoint by validation F1 to `ml/models/misato_<git-sha>.pt`.

If frozen features underperform (val F1 < 0.8), the next move is to fine-tune the visual backbone end-to-end on sampled frames, *not* to make the head fancier.

#### 4. Inference (`predict.py`)

Given an episode mkv:

1. Run feature extraction if not already cached.
2. Score every sample point with the trained model → per-timestamp Misato probability.
3. Smooth the probability series with a small 1D median filter (window ~5 samples = 2.5 s) to kill single-frame flicker.
4. Threshold (default 0.5, tunable) → contiguous runs become spans.
5. Drop spans shorter than 1 second (likely false positives).
6. Write `ml/predictions/S01E03.yml` with the same schema as the label files, plus a `confidence` field per span (mean probability across the span).

### Iteration loop

1. Operator labels 3–5 episodes by hand.
2. Claude trains v1, runs prediction on the remaining episodes.
3. Operator spot-checks predicted spans, fixes them, promotes corrected predictions into `labels/`.
4. Retrain. Repeat until the operator is no longer making meaningful corrections.

### Constraints / gotchas

- **Audio track selection matters.** The English dub uses a different actress; do not mix dubs across train/inference. Lock to the Japanese track and assert it on load.
- **OP and ED appear in every episode.** Misato is in the OP. That means a model that just memorizes the OP frames will look great on training accuracy and learn nothing. Either (a) exclude OP/ED time ranges from training, or (b) make sure both train and val episodes contain OP/ED so the model can't trivially shortcut. Document whichever choice is made in `train.py`.
- **Local only.** Don't upload episode data anywhere. No cloud training services, no remote feature extraction APIs. Pretrained weights from HuggingFace are fine to download.
- **Don't commit `ml/features/` or `ml/models/`** --- both are large and reproducible from `assets/tv/` + the scripts. They're gitignored.

## Repo conventions

- Commits authored as `GrantKlassy`. Identity is set by `~/.gitconfig` includeIf --- don't set it locally.
- Push uses the `github.com-gk` SSH alias (already configured in `.git/config`).
- **Never** add `Co-Authored-By` trailers. Lefthook rejects them; don't write them in the first place.
- See `~/git/grantklassy/CLAUDE.md` for the umbrella conventions across all GrantKlassy repos.
