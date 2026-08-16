# VSReacT example: a feed-forward peak compressor whose UI is built entirely
# from the SDK's stock components — no reference art. Scaffolded with
# create-vsreact and then grown, so it doubles as proof the scaffold is a real
# starting point rather than a demo.
#
#   cmake -S . -B build-vs -G "Visual Studio 17 2022" -A x64 -DJUCE_SOURCE_DIR=H:/code/VSTs/JUCE
#   cmake --build build-vs --target CompressorExample_Standalone --config Release

cmake_minimum_required(VERSION 3.22)

project(VSReacTCompressorExample VERSION 0.1.0)

set(JUCE_SOURCE_DIR "H:/code/VSTs/JUCE" CACHE PATH "Path to a JUCE checkout")

add_subdirectory("${JUCE_SOURCE_DIR}" JUCE EXCLUDE_FROM_ALL)

set(VSREACT_BUILD_TESTS OFF CACHE BOOL "" FORCE)
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../.." vsreact-build)

juce_add_plugin(CompressorExample
    COMPANY_NAME "VSReacT"
    PRODUCT_NAME "VSReacT Compressor"
    BUNDLE_ID "com.vsreact.compressor"
    PLUGIN_MANUFACTURER_CODE Vsrt
    PLUGIN_CODE Vsc2
    FORMATS VST3 AU Standalone
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    COPY_PLUGIN_AFTER_BUILD FALSE)

target_sources(CompressorExample PRIVATE Source/CompressorPlugin.cpp)

target_compile_definitions(CompressorExample
    PRIVATE
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
        COMPRESSOR_EXAMPLE_BUNDLE_PATH="${CMAKE_CURRENT_SOURCE_DIR}/ui/build/main.js")

target_link_libraries(CompressorExample
    PRIVATE
        vsreact
        juce::juce_audio_utils
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)
