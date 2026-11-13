# Kodbox Plugins

Self-hosted Kodbox plugins, maintained as independent plugin directories.

## Plugins

- **assetLedger** — Digital asset inventory / asset relationships. Admin-only; no separate database needed.
- **aiRagLite** — Personal lightweight RAG assistant plugin (to be added separately).

## Install a plugin

Copy a plugin's entire directory into the Kodbox application's `plugins/` directory, e.g.:

```
<KODBOX_ROOT>/plugins/assetLedger/app.php
<KODBOX_ROOT>/plugins/assetLedger/package.json
```

Enable it from the Kodbox administration plugin manager and refresh Kodbox.

## Security

Do not commit credentials, SSH keys, password exports, private inventory JSON, instance-specific configuration, or user data. Personal data is **not** shipped with the plugin source.

These plugins should be tested with the actual Kodbox version before production use.
