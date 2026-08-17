juce_add_console_app(VSReacTTests PRODUCT_NAME "VSReacT Tests")

target_sources(VSReacTTests
    PRIVATE
        TestMain.cpp
        SanityTests.cpp
        JsRuntimeTests.cpp
        ShadowTreeTests.cpp
        PainterTests.cpp
        HitTestTests.cpp
        HostedComponentTests.cpp
        Phase2Tests.cpp
        GapsTests.cpp
        FontRegistryTests.cpp
        MultiInstanceTests.cpp
        PresetManagerTests.cpp
        CanvasTests.cpp
        KnobShaderBench.cpp
        PaintBench.cpp
        PainterKeysTests.cpp
        ExampleBundleTests.cpp
        ExampleInteractionTests.cpp
        TestHelpers.h)

target_compile_definitions(VSReacTTests
    PRIVATE
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        VSREACT_TEST_FONT_PATH="${CMAKE_CURRENT_SOURCE_DIR}/../examples/drums/ui/src/assets/narrow.otf"
        VSREACT_EXAMPLES_DIR="${CMAKE_CURRENT_SOURCE_DIR}/../examples")

target_link_libraries(VSReacTTests
    PRIVATE
        vsreact
        juce::juce_gui_extra
        juce::juce_audio_processors
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)

# The example UIs are evaluated for real, and a debug build's QuickJS frames
# are large enough that one React commit can approach the 1MB a Windows
# executable gets by default. macOS and Linux give the main thread 8MB
# already; MSVC needs telling.
if(MSVC)
    target_link_options(VSReacTTests PRIVATE /STACK:8388608)
endif()

add_test(NAME VSReacTUnit COMMAND VSReacTTests)
