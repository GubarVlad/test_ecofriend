# PWA Icons Instructions

## Quick Solution (Included!)

**We've included a simple icon generator tool!**

1. Open `generate-icons.html` in your browser
2. Click "Download All Icons" button
3. Save all generated icons to this directory
4. Reload your app

The icons will have a green background with a plant emoji. Good enough for testing!

---

## Required Icons

The PWA needs icons in the following sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

## How to Generate Better Icons

### Option 1: Using Online Tools (Easiest)

1. Create a 512x512 icon with the 🌱 emoji or your logo
2. Use a PWA icon generator:
   - https://www.pwabuilder.com/imageGenerator
   - https://realfavicongenerator.net/
   - https://maskable.app/editor

3. Upload your 512x512 icon
4. Download the generated icon pack
5. Replace the files in this `/icons` directory

### Option 2: Using Design Tools

**Figma:**
1. Create 512x512 artboard
2. Add green circle background (#22c55e)
3. Add white 🌱 emoji (or custom logo)
4. Export as PNG in all required sizes

**Canva:**
1. Create custom size 512x512
2. Use green background
3. Add plant icon/emoji
4. Download
5. Resize using tool like https://imageresizer.com/

### Option 3: Command Line (Advanced)

If you have ImageMagick installed:

```bash
# Create base icon (you need a source.png file first)
convert source.png -resize 512x512 icon-512x512.png
convert source.png -resize 384x384 icon-384x384.png
convert source.png -resize 192x192 icon-192x192.png
convert source.png -resize 152x152 icon-152x152.png
convert source.png -resize 144x144 icon-144x144.png
convert source.png -resize 128x128 icon-128x128.png
convert source.png -resize 96x96 icon-96x96.png
convert source.png -resize 72x72 icon-72x72.png
```

## Temporary Solution

For testing purposes, you can use any green plant/recycle images in these sizes, or even solid colored squares. The app will work without proper icons, but won't look professional when installed.

## Icon Design Guidelines

### Colors
- Primary: #22c55e (green)
- Background: White or transparent
- Icon: Plant, leaf, recycle symbol, or earth

### Style
- Simple and recognizable
- Scalable (looks good at all sizes)
- Consistent with app branding
- Follows platform guidelines (iOS/Android)

### Maskable Icons
- Safe zone: Center 80% of canvas
- Padding: 10% on all sides
- Background: Solid color (no transparency for maskable)

## Testing Icons

1. Install the PWA on your device
2. Check home screen icon appearance
3. Check splash screen (iOS/Android)
4. Verify all sizes display correctly

## Icon Checklist

- [ ] All sizes generated (72-512px)
- [ ] Maskable versions included
- [ ] Proper naming convention
- [ ] PNG format, optimized
- [ ] Transparent background (non-maskable)
- [ ] Solid background (maskable)
- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Looks good at all sizes

## Resources

- [PWA Icon Guidelines](https://web.dev/add-manifest/)
- [Maskable Icon Spec](https://web.dev/maskable-icon/)
- [iOS Icon Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/icons-and-images/app-icon/)
- [Android Adaptive Icons](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)
