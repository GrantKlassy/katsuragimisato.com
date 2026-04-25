# scripts/

Python pipeline for the Misato detector. **Don't type here** --- Claude fills this in once `../labels/misato.txt` has data to train on.

Planned files:

- `extract_features.py` --- sample frames + audio at 2 fps from each mkv in `assets/tv/`, embed with frozen DINOv2-small (visual) + wav2vec2-base (audio, Japanese track), cache to `../features/`.
- `build_dataset.py` --- parse `../labels/misato.txt` and join with cached features into a `torch.utils.data.Dataset`.
- `train.py` --- small MLP head over concat features. BCE loss with `pos_weight`. Save best-val-F1 checkpoint to `../models/`.
- `predict.py` --- score an mkv, median-filter the probability series, threshold → contiguous spans, write `../predictions/<episode>.yml`.

See `../../CLAUDE.md` for the full design.
