#include <vsreact/vsreact.h>

class HostedComponentTests final : public juce::UnitTest
{
public:
    HostedComponentTests() : juce::UnitTest ("vsreact hosted components") {}

    void runTest() override
    {
        beginTest ("NativeView mounts a registered component and yoga positions it");
        {
            bool created = false;

            vsreact::NativeRegistry registry;
            registry.registerFactory ("dummy", [&created]() -> std::unique_ptr<juce::Component>
            {
                created = true;
                auto component = std::make_unique<juce::Component>();
                component->setName ("dummy");
                return component;
            });

            vsreact::RootOptions options;
            options.bundleSource = R"js(
                __vsreact_flush(JSON.stringify([
                    ["create", 1, "view"],
                    ["setProps", 1, {"style": {"width": "100%", "height": "100%", "padding": 10}}],
                    ["appendChild", 0, 1],
                    ["create", 2, "native"],
                    ["setProps", 2, {"style": {"flex": 1}, "nativeId": "dummy"}],
                    ["appendChild", 1, 2]
                ]));
            )js";

            vsreact::RootView root (std::move (options), std::move (registry));
            root.setSize (200, 100);

            expect (created);
            expect (root.isBundleLoaded());

            juce::Component* dummy = nullptr;

            for (auto* child : root.getChildren())
                if (child->getName() == "dummy")
                    dummy = child;

            expect (dummy != nullptr);

            if (dummy != nullptr)
                expect (dummy->getBounds() == juce::Rectangle<int> (10, 10, 180, 80));
        }

        beginTest ("textinput mounts a TextInputHost carrying value and placeholder");
        {
            vsreact::RootOptions options;
            options.bundleSource = R"js(
                __vsreact_flush(JSON.stringify([
                    ["create", 1, "textinput"],
                    ["setProps", 1, {"style": {"width": 150, "height": 30, "color": "#ff0000"},
                                      "value": "hello", "placeholder": "type..."}],
                    ["appendChild", 0, 1]
                ]));
            )js";

            vsreact::RootView root (std::move (options), {});
            root.setSize (300, 100);

            vsreact::TextInputHost* host = nullptr;

            for (auto* child : root.getChildren())
                if (auto* candidate = dynamic_cast<vsreact::TextInputHost*> (child))
                    host = candidate;

            expect (host != nullptr);

            if (host != nullptr)
            {
                expectEquals (host->getValue(), juce::String ("hello"));
                expect (host->getBounds() == juce::Rectangle<int> (0, 0, 150, 30));
            }
        }

        beginTest ("removing the node destroys the hosted component");
        {
            vsreact::NativeRegistry registry;
            registry.registerFactory ("dummy", []() { return std::make_unique<juce::Component>(); });

            vsreact::RootOptions options;
            options.bundleSource = R"js(
                __vsreact_flush(JSON.stringify([
                    ["create", 1, "native"],
                    ["setProps", 1, {"style": {"width": 50, "height": 50}, "nativeId": "dummy"}],
                    ["appendChild", 0, 1]
                ]));
                globalThis.__vsreact_dispatch = function (json) {
                    var msg = JSON.parse(json);
                    if (msg.kind === "native" && msg.name === "remove")
                        __vsreact_flush(JSON.stringify([["removeChild", 0, 1]]));
                };
            )js";

            vsreact::RootView root (std::move (options), std::move (registry));
            root.setSize (100, 100);

            const auto childrenBefore = root.getNumChildComponents();
            root.sendNativeEvent ("remove", {});

            expectEquals (root.getNumChildComponents(), childrenBefore - 1);
        }
    }
};

static HostedComponentTests hostedComponentTests;
