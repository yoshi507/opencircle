#!/bin/bash
set -e
APP_URL="https://opencircle-lol-creative.vercel.app/app"
APP_NAME="OpenCircle"
DESKTOP="$HOME/Desktop"
APPS="$HOME/Applications"
mkdir -p "$APPS"

APP_DIR="$APPS/$APP_NAME.app"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

cat > "$APP_DIR/Contents/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>OpenCircle</string>
  <key>CFBundleDisplayName</key><string>OpenCircle</string>
  <key>CFBundleIdentifier</key><string>app.opencircle.desktop</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>OpenCircle</string>
</dict>
</plist>
PLIST

cat > "$APP_DIR/Contents/MacOS/OpenCircle" << 'EXEC'
#!/bin/bash
URL="https://opencircle-lol-creative.vercel.app/app"
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$URL" --new-window
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="$URL" --new-window
elif [ -d "/Applications/Arc.app" ]; then
  open -na "Arc" --args --app="$URL"
else
  open "$URL"
fi
EXEC
chmod +x "$APP_DIR/Contents/MacOS/OpenCircle"

# Desktop alias
ln -sf "$APP_DIR" "$DESKTOP/OpenCircle.app" 2>/dev/null || true

echo ""
echo " OpenCircle installed to ~/Applications/OpenCircle.app"
echo " A shortcut was added to your Desktop."
echo " Launching…"
echo ""
open "$APP_DIR"
