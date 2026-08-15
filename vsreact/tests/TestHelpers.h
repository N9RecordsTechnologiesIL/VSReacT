#pragma once

#include <vsreact/vsreact.h>

// Helpers shared by the painter test suites. Both files compile into the one
// VSReacTTests target, so these are `inline` to keep the linker happy.

inline juce::Image renderTree (vsreact::ShadowTree& tree, int width, int height)
{
    tree.computeLayout (static_cast<float> (width), static_cast<float> (height));

    juce::Image image (juce::Image::ARGB, width, height, true);
    juce::Graphics g (image);
    g.fillAll (juce::Colours::black);
    vsreact::Painter::paint (g, *tree.root());
    return image;
}

// Count pixels brighter than the threshold — a proxy for "how much ink".
inline int inkCount (const juce::Image& image, float threshold = 0.02f)
{
    int count = 0;

    for (int y = 0; y < image.getHeight(); ++y)
        for (int x = 0; x < image.getWidth(); ++x)
            if (image.getPixelAt (x, y).getBrightness() > threshold)
                ++count;

    return count;
}
