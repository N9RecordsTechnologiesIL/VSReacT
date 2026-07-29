#pragma once

#include <juce_graphics/juce_graphics.h>

namespace vsreact
{

/** Per-canvas-node pixel store: a plain RGBA buffer JS writes into, plus the
    premultiplied-ARGB juce::Image the painter blits. commit() swizzles one
    into the other. Message thread only. */
struct CanvasSurface
{
    int width = 0, height = 0;
    juce::HeapBlock<juce::uint8> rgba;   // width*height*4, RGBA, written by JS
    juce::Image image;                   // ARGB premultiplied, blitted by Painter

    /** Ensure the RGBA buffer matches (w,h); returns its base pointer. */
    juce::uint8* ensure (int w, int h)
    {
        w = juce::jmax (1, w);
        h = juce::jmax (1, h);

        if (w != width || h != height || rgba == nullptr)
        {
            width = w;
            height = h;
            rgba.calloc ((size_t) w * (size_t) h * 4);
            image = juce::Image (juce::Image::ARGB, w, h, true);
        }

        return rgba.get();
    }

    size_t byteSize() const noexcept { return (size_t) width * (size_t) height * 4; }

    /** Swizzle the JS-written RGBA into the premultiplied-ARGB image. */
    void commit()
    {
        if (! image.isValid() || rgba == nullptr)
            return;

        juce::Image::BitmapData bmp (image, juce::Image::BitmapData::writeOnly);
        const juce::uint8* src = rgba.get();

        for (int y = 0; y < height; ++y)
        {
            auto* dest = reinterpret_cast<juce::PixelARGB*> (bmp.getLinePointer (y));

            for (int x = 0; x < width; ++x)
            {
                dest[x].setARGB (src[3], src[0], src[1], src[2]); // a, r, g, b
                dest[x].premultiply();
                src += 4;
            }
        }
    }
};

} // namespace vsreact
