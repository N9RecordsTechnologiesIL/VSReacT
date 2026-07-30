# VSReacT example: a stereo delay effect whose UI is the DirtyDelay
# reference-art design — 4 baked film-strip knobs (TIME/FEEDBACK/TONE/MIX)
# patched over the plate photo, a live 7-segment delay readout, and a
# hardware bat-lever bypass. DSP is a real circular-buffer delay with a
# tone-controlled one-pole in the feedback path. Parameters bind through
# vsreact::ParameterBridge, exactly like the gain example.
#
#   cmake -S . -B build-vs -G "Visual Studio 17 2022" -A x64 -DJUCE_SOURCE_DIR=H:/code/VSTs/JUCE
#   cmake --build build-vs --target DelayExample_Standalone --config Release

cmake_minimum_required(VERSION 3.22)

project(VSReacTDelayExample VERSION 0.1.0)

set(JUCE_SOURCE_DIR "H:/code/VSTs/JUCE" CACHE PATH "Path to a JUCE checkout")

add_subdirectory("${JUCE_SOURCE_DIR}" JUCE EXCLUDE_FROM_ALL)

set(VSREACT_BUILD_TESTS OFF CACHE BOOL "" FORCE)
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../.." vsreact-build)

juce_add_plugin(DelayExample
    COMPANY_NAME "VSReacT"
    PRODUCT_NAME "VSReacT Delay"
    PLUGIN_MANUFACTURER_CODE Vsrt
    PLUGIN_CODE Vsd1
    FORMATS VST3 Standalone
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    COPY_PLUGIN_AFTER_BUILD FALSE)

target_sources(DelayExample PRIVATE Source/DelayPlugin.cpp)

target_compile_definitions(DelayExample
    PRIVATE
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
        DELAY_EXAMPLE_BUNDLE_PATH="${CMAKE_CURRENT_SOURCE_DIR}/ui/build/main.js")

target_link_libraries(DelayExample
    PRIVATE
        vsreact
        juce::juce_audio_utils
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)
