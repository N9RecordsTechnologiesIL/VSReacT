#include "Blur.h"

#include <cstring>
#include <vector>

namespace vsreact
{

namespace
{
    /** One stack-blur pass along one axis. A "line" is a row (horizontal
        pass) or a column (vertical pass); strides express both cases. */
    void stackBlurPass (juce::uint8* data, int lineCount, int lineLength,
                        int lineStride, int pixelStride, int radius)
    {
        const auto scale = (long) (radius + 1) * (radius + 1);
        std::vector<juce::uint8> source ((size_t) lineLength * 4);

        for (int lineIndex = 0; lineIndex < lineCount; ++lineIndex)
        {
            auto* line = data + (size_t) lineIndex * (size_t) lineStride;

            for (int i = 0; i < lineLength; ++i)
                std::memcpy (&source[(size_t) i * 4], line + (size_t) i * (size_t) pixelStride, 4);

            const auto at = [&] (int i) -> const juce::uint8*
            {
                return &source[(size_t) juce::jlimit (0, lineLength - 1, i) * 4];
            };

            // sum carries triangular weights centred on the current pixel;
            // sumOut covers [x-r, x], sumIn covers [x+1, x+r].
            long sum[4] = {}, sumIn[4] = {}, sumOut[4] = {};

            for (int i = -radius; i <= radius; ++i)
            {
                const auto* p = at (i);
                const auto weight = (long) (radius + 1 - std::abs (i));

                for (int c = 0; c < 4; ++c)
                {
                    sum[c] += p[c] * weight;
                    (i <= 0 ? sumOut : sumIn)[c] += p[c];
                }
            }

            for (int x = 0; x < lineLength; ++x)
            {
                auto* dst = line + (size_t) x * (size_t) pixelStride;

                for (int c = 0; c < 4; ++c)
                    dst[c] = (juce::uint8) (sum[c] / scale);

                const auto* leaving = at (x - radius);
                const auto* entering = at (x + radius + 1);
                const auto* crossing = at (x + 1);   // moves from the in-side to the out-side

                for (int c = 0; c < 4; ++c)
                {
                    sum[c] -= sumOut[c];
                    sumOut[c] -= leaving[c];
                    sumIn[c] += entering[c];
                    sum[c] += sumIn[c];
                    sumOut[c] += crossing[c];
                    sumIn[c] -= crossing[c];
                }
            }
        }
    }
}

void stackBlur (juce::Image& image, int radius)
{
    if (radius < 1 || image.getWidth() < 1 || image.getHeight() < 1)
        return;

    if (image.getFormat() != juce::Image::ARGB)
        image = image.convertedToFormat (juce::Image::ARGB);

    radius = juce::jmin (radius, 254);

    juce::Image::BitmapData pixels (image, juce::Image::BitmapData::readWrite);

    // Horizontal, then vertical.
    stackBlurPass (pixels.data, image.getHeight(), image.getWidth(),
                   pixels.lineStride, pixels.pixelStride, radius);
    stackBlurPass (pixels.data, image.getWidth(), image.getHeight(),
                   pixels.pixelStride, pixels.lineStride, radius);
}

} // namespace vsreact
