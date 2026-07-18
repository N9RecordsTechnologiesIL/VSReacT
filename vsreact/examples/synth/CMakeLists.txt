# VSReacT example: an 8-voice sine synth — PianoKeyboard, the ADSR
# envelope editor, both wheels, a RingMeter fed by native events, and
# the full @vsreact/posthog integration (sessions, parameter analytics,
# error tracking).
#
#   cmake -S . -B build-vs -G "Visual Studio 17 2022" -A x64 -DJUCE_SOURCE_DIR=H:/code/VSTs/JUCE
#   cmake --build build-vs --target SynthExample_Standalone --config Release

cmake_minimum_required(VERSION 3.22)

project(VSReacTSynthExample VERSION 0.1.0)

set(JUCE_SOURCE_DIR "H:/code/VSTs/JUCE" CACHE PATH "Path to a JUCE checkout")

add_subdirectory("${JUCE_SOURCE_DIR}" JUCE EXCLUDE_FROM_ALL)

set(VSREACT_BUILD_TESTS OFF CACHE BOOL "" FORCE)
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../.." vsreact-build)

juce_add_plugin(SynthExample
    COMPANY_NAME "VSReacT"
    PRODUCT_NAME "VSReacT Synth"
    PLUGIN_MANUFACTURER_CODE Vsrt
    PLUGIN_CODE Vss1
    FORMATS VST3 Standalone
    IS_SYNTH TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    COPY_PLUGIN_AFTER_BUILD FALSE)

target_sources(SynthExample PRIVATE Source/SynthPlugin.cpp)

target_compile_definitions(SynthExample
    PRIVATE
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
        SYNTH_EXAMPLE_BUNDLE_PATH="${CMAKE_CURRENT_SOURCE_DIR}/ui/build/main.js")

target_link_libraries(SynthExample
    PRIVATE
        vsreact
        juce::juce_audio_utils
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)
