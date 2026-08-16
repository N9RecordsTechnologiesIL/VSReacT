# VSReacT example: a channel strip — the interactive EQCurve bound to
# real APVTS bands (the same RBJ math runs in C++ and in the display),
# a gain-reduction Meter, a RingMeter, and a Disclosure row. Light
# PostHog integration (editor sessions + screens).
#
#   cmake -S . -B build-vs -G "Visual Studio 17 2022" -A x64 -DJUCE_SOURCE_DIR=H:/code/VSTs/JUCE
#   cmake --build build-vs --target ChannelExample_Standalone --config Release

cmake_minimum_required(VERSION 3.22)

project(VSReacTChannelExample VERSION 0.1.0)

set(JUCE_SOURCE_DIR "H:/code/VSTs/JUCE" CACHE PATH "Path to a JUCE checkout")

add_subdirectory("${JUCE_SOURCE_DIR}" JUCE EXCLUDE_FROM_ALL)

set(VSREACT_BUILD_TESTS OFF CACHE BOOL "" FORCE)
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../.." vsreact-build)

juce_add_plugin(ChannelExample
    COMPANY_NAME "VSReacT"
    PRODUCT_NAME "VSReacT Channel"
    BUNDLE_ID "com.vsreact.channel"
    PLUGIN_MANUFACTURER_CODE Vsrt
    PLUGIN_CODE Vsc1
    FORMATS VST3 AU Standalone
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    COPY_PLUGIN_AFTER_BUILD FALSE)

target_sources(ChannelExample PRIVATE Source/ChannelPlugin.cpp)

target_compile_definitions(ChannelExample
    PRIVATE
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
        CHANNEL_EXAMPLE_BUNDLE_PATH="${CMAKE_CURRENT_SOURCE_DIR}/ui/build/main.js")

target_link_libraries(ChannelExample
    PRIVATE
        vsreact
        juce::juce_audio_utils
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)
