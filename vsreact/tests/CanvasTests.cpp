#include <vsreact/vsreact.h>

class CanvasChannelTests final : public juce::UnitTest
{
public:
    CanvasChannelTests() : juce::UnitTest ("vsreact::CanvasChannel") {}

    void runTest() override
    {
        beginTest ("JS writes into an ArrayBuffer aliasing C++ memory; commit reports the id");
        {
            std::vector<juce::uint8> storage (16, 0);
            int committed = -1;
            int reqW = 0, reqH = 0;

            vsreact::JsRuntime::Callbacks cbs;
            cbs.onCanvasBuffer = [&] (int, int w, int h) -> vsreact::JsRuntime::CanvasBuffer
            {
                reqW = w; reqH = h;
                return { storage.data(), storage.size() };
            };
            cbs.onCanvasCommit = [&] (int id) { committed = id; };

            vsreact::JsRuntime js { cbs };
            expect (js.evaluate (
                "const ab = __vsreact_canvasBuffer(7, 2, 2);"
                "const px = new Uint8ClampedArray(ab);"
                "px[0] = 255; px[5] = 128; px[15] = 64;"
                "__vsreact_canvasCommit(7);", "t.js"));

            expectEquals (reqW, 2);
            expectEquals (reqH, 2);
            expectEquals ((int) storage[0], 255);
            expectEquals ((int) storage[5], 128);
            expectEquals ((int) storage[15], 64);
            expectEquals (committed, 7);
            expectEquals ((int) storage[1], 0);   // untouched bytes stay zero
        }

        beginTest ("a null buffer yields null in JS without crashing");
        {
            juce::String logged;

            vsreact::JsRuntime::Callbacks cbs;
            cbs.onCanvasBuffer = [] (int, int, int) -> vsreact::JsRuntime::CanvasBuffer { return {}; };
            cbs.onLog = [&] (const juce::String&, const juce::String& m) { logged = m; };

            vsreact::JsRuntime js { cbs };
            expect (js.evaluate (
                "__vsreact_log('log', String(__vsreact_canvasBuffer(1,1,1) === null));", "t.js"));
            expectEquals (logged, juce::String ("true"));
        }

        beginTest ("CanvasSurface swizzles RGBA into a premultiplied ARGB image");
        {
            vsreact::CanvasSurface surface;
            auto* buf = surface.ensure (2, 1);
            expect (buf != nullptr);
            expectEquals ((int) surface.byteSize(), 8);

            buf[0] = 255; buf[1] = 0;   buf[2] = 0; buf[3] = 255; // opaque red
            buf[4] = 0;   buf[5] = 255; buf[6] = 0; buf[7] = 255; // opaque green
            surface.commit();

            expect (surface.image.isValid());
            expectEquals (surface.image.getPixelAt (0, 0).getRed(),   (juce::uint8) 255);
            expectEquals (surface.image.getPixelAt (0, 0).getGreen(), (juce::uint8) 0);
            expectEquals (surface.image.getPixelAt (1, 0).getGreen(), (juce::uint8) 255);
            expectEquals (surface.image.getPixelAt (1, 0).getRed(),   (juce::uint8) 0);
        }

        beginTest ("CanvasSurface::ensure re-allocates only on size change");
        {
            vsreact::CanvasSurface surface;
            auto* a = surface.ensure (4, 4);
            auto* b = surface.ensure (4, 4);
            expect (a == b);
            surface.ensure (5, 5);
            expectEquals ((int) surface.byteSize(), 100);
        }

        beginTest ("alpha survives the swizzle (transparent stays transparent)");
        {
            vsreact::CanvasSurface surface;
            auto* buf = surface.ensure (1, 1);
            buf[0] = 200; buf[1] = 100; buf[2] = 50; buf[3] = 0; // fully transparent
            surface.commit();
            expectEquals (surface.image.getPixelAt (0, 0).getAlpha(), (juce::uint8) 0);
        }
    }
};

static CanvasChannelTests canvasChannelTests;
