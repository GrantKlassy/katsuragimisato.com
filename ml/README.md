# ml/ --- Misato detector

## Where you type

**[`labels/misato.txt`](labels/misato.txt)** --- that's it. Only file you touch.

Open it in any editor. The format guide is at the top of the file. All 26 episode headers are already stubbed; scroll to the one you're watching and append `START - END` lines as Misato comes on/off screen.

## Where you don't type

| Path                                             | What                                       | Who writes here       |
| ------------------------------------------------ | ------------------------------------------ | --------------------- |
| `scripts/`                                       | Training + inference pipeline              | Claude                |
| `predictions/`                                   | Model's predicted Misato spans per episode | The trained model     |
| `features/` _(gitignored, created on first run)_ | Cached frame + audio embeddings            | `extract_features.py` |
| `models/` _(gitignored, created on first run)_   | Trained PyTorch checkpoints                | `train.py`            |

## The plan

See [`../CLAUDE.md`](../CLAUDE.md) for the full design --- labels → features → multimodal classifier → predicted spans → operator spot-check → retrain.
