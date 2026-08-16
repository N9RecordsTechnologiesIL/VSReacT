#include "ImageRegistry.h"

#include "Painter.h"
#include "WebpImage.h"

namespace vsreact
{

juce::Image loadImageSource (const juce::String& src)
{
    if (src.startsWith ("data:"))
        return Painter::decodeDataUriImage (src);

    // WebP files aren't in juce::ImageFileFormat's registry — try the
    // standard formats first, then the vendored decoder.
    const juce::File file (src);
    auto image = juce::ImageFileFormat::loadFrom (file);

    if (image.isValid())
        return image;

    juce::MemoryBlock bytes;

    if (file.loadFileAsData (bytes) && looksLikeWebP (bytes.getData(), bytes.getSize()))
        return decodeWebPImage (bytes.getData(), bytes.getSize());

    return {};
}

juce::String ImageRegistry::registerImage (const juce::String& src)
{
    auto image = loadImageSource (src);

    if (! image.isValid())
        return {};

    const auto handle = "img:" + juce::String (nextId++);
    images[handle] = image;
    return handle;
}

juce::Image ImageRegistry::find (const juce::String& handle) const
{
    const auto it = images.find (handle);
    return it != images.end() ? it->second : juce::Image();
}

} // namespace vsreact
