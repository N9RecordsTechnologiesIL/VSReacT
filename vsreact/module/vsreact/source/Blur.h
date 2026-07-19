#pragma once

#include <juce_graphics/juce_graphics.h>

namespace vsreact
{

/** In-place stack blur (Mario Klingemann's algorithm) on an ARGB image —
    a fast O(n) approximation of a gaussian blur, radius in pixels.

    JUCE ARGB images are premultiplied, which is exactly what makes blurring
    the four channels independently correct for later compositing. */
void stackBlur (juce::Image& image, int radius);

} // namespace vsreact
