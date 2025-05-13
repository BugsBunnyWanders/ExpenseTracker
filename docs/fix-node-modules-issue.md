# Fixing Node.js Modules in React Native

This document provides instructions for fixing the error:
```
The package at "node_modules\ws\lib\sender.js" attempted to import the Node standard library module "stream".
It failed because the native React runtime does not include the Node standard library.
```

## Quick Fix

1. Connect your phone to the same WiFi network as your development machine.
2. Clear the Expo cache on your phone:
   - For Android: Open the Expo Go app, go to Profile tab, tap on "Clear Cache"
   - For iOS: Uninstall and reinstall the Expo Go app
3. On your development machine, run:
   ```
   npm run start-clean
   ```
4. If the issue persists, try a complete reinstall:
   ```
   npm run clean-reinstall
   npm run start-clean
   ```

## Manual Fix Steps

If the quick fix doesn't work, follow these detailed steps:

### 1. Clean Your Project

```bash
# Clear the Expo cache
expo doctor --fix
# Remove node_modules and cache
rimraf node_modules
rimraf .expo
npm cache clean --force
```

### 2. Reinstall Dependencies

```bash
npm install
```

### 3. Apply Polyfills

```bash
npm run postinstall
```

### 4. Start with a Clean Cache

```bash
expo start --clear
```

## How the Fix Works

This issue occurs because the 'ws' library tries to use Node.js built-in modules that aren't available in React Native. Our solution:

1. **Create empty shims** for Node.js modules
2. **Patch the ws library's sender.js file** to use our custom polyfills instead of Node.js modules
3. **Create a custom stream implementation** that provides the minimal functionality needed
4. **Configure Metro bundler** to redirect imports to our polyfills
5. **Disable WebSocket connections** in the Supabase client configuration
6. **Mock the WebSocket constructor** to prevent any attempts to use it

The most important files for this fix are:
- `scripts/setup-polyfills.js`: Creates shims and patches files
- `scripts/polyfills/ws-stream-polyfill.js`: Custom stream implementation
- `metro.config.js`: Configures the Metro bundler to use our polyfills
- `services/supabase.js`: Disables WebSocket connections

## Troubleshooting

If you're still experiencing issues:

1. Check the Metro bundler logs for specific errors
2. Make sure your polyfill files exist in `scripts/polyfills/`
3. Verify that the ws library is patched correctly
4. Ensure the Supabase client is configured to disable realtime features
5. Try running on a different device or emulator

If nothing else works, try modifying your `app.json` to add:

```json
"expo": {
  ...
  "experiments": {
    "nodeModulesPath": "./node_modules"
  }
}
```

Then run a complete reinstall and restart. 