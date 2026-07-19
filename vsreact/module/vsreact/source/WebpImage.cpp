#include "WebpImage.h"

#include "src/webp/decode.h"

#include <cstring>
#include <memory>

namespace vsreact
{

bool looksLikeWebP (const void* data, size_t size)
{
    if (data == nullptr || size < 12)
        return false;

    const auto* bytes = static_cast<const char*> (data);
    return std::memcmp (bytes, "RIFF", 4) == 0
        && std::memcmp (bytes + 8, "WEBP", 4) == 0;
}

juce::Image decodeWebPImage (const void* data, size_t size)
{
    if (! looksLikeWebP (data, size))
        return {};

    const auto* bytes = static_cast<const uint8_t*> (data);
    int width = 0, height = 0;

    if (! WebPGetInfo (bytes, size, &width, &height) || width <= 0 || height <= 0)
        return {};

    const std::unique_ptr<uint8_t, decltype (&WebPFree)> rgba (
        WebPDecodeRGBA (bytes, size, &width, &height), &WebPFree);

    if (rgba == nullptr)
        return {};

    juce::Image image (juce::Image::ARGB, width, height, false);
    juce::Image::BitmapData pixels (image, juce::Image::BitmapData::writeOnly);

    for (int y = 0; y < height; ++y)
    {
        const auto* row = rgba.get() + (size_t) y * (size_t) width * 4;

        for (int x = 0; x < width; ++x)
        {
            // setPixelColour premultiplies into JUCE's ARGB layout.
            const auto* p = row + (size_t) x * 4;
            pixels.setPixelColour (x, y, juce::Colour (p[0], p[1], p[2], p[3]));
        }
    }

    return image;
}

} // namespace vsreact
