# predictions/

The trained model writes one YAML file per episode here, e.g. `S01E03.yml`:

```yaml
episode: S01E03
model: misato_<git-sha>.pt
spans:
  - start: 00:01:23.500
    end: 00:02:45.000
    confidence: 0.94
  - start: 00:05:11.000
    end: 00:05:34.000
    confidence: 0.81
```

**Don't type here.** Spot-check predictions against the episode, then promote corrected spans into `../labels/misato.txt` (under the matching `## S01EXX` block, with a `DONE` marker) so the next training run sees them as ground truth.
