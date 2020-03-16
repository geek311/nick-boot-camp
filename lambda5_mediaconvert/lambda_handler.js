// Load the SDK for JavaScript
let AWS = require('aws-sdk');
const codes = require('./iso_639-1');
    
exports.handler = function(event, context, callback) {
    
    let s3 = new AWS.S3();
    let srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    let audioInputFile = event.Records[0].s3.object.key;
    
    // sort out the original video filename
    let originalVideoFileNameWithoutTimeStamp = audioInputFile.substring(10);
    console.log("video file name without timestamp is " + originalVideoFileNameWithoutTimeStamp);
    let originalVideoFilename = originalVideoFileNameWithoutTimeStamp.split("_translated")[0];
    console.log("video file is " + originalVideoFilename);


    // now get the subtitles
    let tranlatedSubtitlesLanguage = originalVideoFilename.split("__")[2].substring(0,2);
    let subtitleFileName = audioInputFile.split(".")[0]+".srt";

    // need to use this in various places // TODO SWAP THE HARDCODED ES for a lookup from filename
    let threeLetterLanguageCode = codes[tranlatedSubtitlesLanguage]["639-2"].toUpperCase();
    let languageName = codes[tranlatedSubtitlesLanguage]["name"];

    console.log(threeLetterLanguageCode + " is being used for " + languageName)


    // Set the custom endpoint for your account
    AWS.config.mediaconvert = {endpoint : 'https://vasjpylpa.mediaconvert.us-east-1.amazonaws.com'};
    
    audioInputFile = "s3://"+srcBucket + "/"+audioInputFile;
    let masterVideoFile = "s3://ai.conygre.com/uploads/"+originalVideoFilename+".mp4";
    let translatedSubtitles = "s3://transcribe.srt.conygre.com/" + subtitleFileName;
    let destinationLocation = "s3://transcribe.output.conygre.com/" + originalVideoFilename+"/";;

    console.log("audio file: "+ audioInputFile);
    console.log("master video "+ masterVideoFile);
    console.log("translated subtitles " + translatedSubtitles);
    console.log("destination location "+ destinationLocation);



    // needs to be parameterised and also to support 2 languages for captions and voice
    var mediaConvertParams = {
        "Settings": {
          "AdAvailOffset": 0,
          "Inputs": [
            {
              "FilterEnable": "AUTO",
              "PsiControl": "USE_PSI",
              "FilterStrength": 0,
              "DeblockFilter": "DISABLED",
              "DenoiseFilter": "DISABLED",
              "TimecodeSource": "EMBEDDED",
              "VideoSelector": {
                "ColorSpace": "FOLLOW",
                "Rotate": "DEGREE_0",
                "AlphaBehavior": "DISCARD"
              },
              "AudioSelectors": {
                "Audio Selector 1": {
                  "Offset": 0,
                  "DefaultSelection": "DEFAULT",
                  "ProgramSelection": 1,
                  "SelectorType": "LANGUAGE_CODE",
                  "LanguageCode": threeLetterLanguageCode,
                  "ExternalAudioFileInput": audioInputFile
                }
              },
              "FileInput": masterVideoFile,
              "CaptionSelectors": {
                "Captions Selector 1": {
                  "SourceSettings": {
                    "SourceType": "SRT",
                    "FileSourceSettings": {
                      "SourceFile": translatedSubtitles
                    }
                  }
                }
              }
            }
          ],
          "OutputGroups": [
            {
              "Name": "Apple HLS",
              "OutputGroupSettings": {
                "Type": "HLS_GROUP_SETTINGS",
                "HlsGroupSettings": {
                  "ManifestDurationFormat": "INTEGER",
                  "SegmentLength": 10,
                  "TimedMetadataId3Period": 10,
                  "CaptionLanguageSetting": "OMIT",
                  "TimedMetadataId3Frame": "PRIV",
                  "CodecSpecification": "RFC_4281",
                  "OutputSelection": "MANIFESTS_AND_SEGMENTS",
                  "ProgramDateTimePeriod": 600,
                  "MinSegmentLength": 0,
                  "MinFinalSegmentLength": 0,
                  "DirectoryStructure": "SINGLE_DIRECTORY",
                  "ProgramDateTime": "EXCLUDE",
                  "SegmentControl": "SEGMENTED_FILES",
                  "ManifestCompression": "NONE",
                  "ClientCache": "ENABLED",
                  "StreamInfResolution": "INCLUDE",
                  "Destination": destinationLocation
                }
              },
              "Outputs": [
                {
                  "VideoDescription": {
                    "ScalingBehavior": "DEFAULT",
                    "TimecodeInsertion": "DISABLED",
                    "AntiAlias": "ENABLED",
                    "Sharpness": 50,
                    "CodecSettings": {
                      "Codec": "H_264",
                      "H264Settings": {
                        "InterlaceMode": "PROGRESSIVE",
                        "NumberReferenceFrames": 3,
                        "Syntax": "DEFAULT",
                        "Softness": 0,
                        "GopClosedCadence": 1,
                        "GopSize": 90,
                        "Slices": 1,
                        "GopBReference": "DISABLED",
                        "SlowPal": "DISABLED",
                        "SpatialAdaptiveQuantization": "ENABLED",
                        "TemporalAdaptiveQuantization": "ENABLED",
                        "FlickerAdaptiveQuantization": "DISABLED",
                        "EntropyEncoding": "CABAC",
                        "FramerateControl": "INITIALIZE_FROM_SOURCE",
                        "RateControlMode": "QVBR",
                        "CodecProfile": "MAIN",
                        "Telecine": "NONE",
                        "MinIInterval": 0,
                        "AdaptiveQuantization": "HIGH",
                        "CodecLevel": "AUTO",
                        "FieldEncoding": "PAFF",
                        "SceneChangeDetect": "ENABLED",
                        "QualityTuningLevel": "SINGLE_PASS",
                        "FramerateConversionAlgorithm": "DUPLICATE_DROP",
                        "UnregisteredSeiTimecode": "DISABLED",
                        "GopSizeUnits": "FRAMES",
                        "ParControl": "INITIALIZE_FROM_SOURCE",
                        "NumberBFramesBetweenReferenceFrames": 2,
                        "RepeatPps": "DISABLED",
                        "DynamicSubGop": "STATIC",
                        "QvbrSettings": {
                          "QvbrQualityLevel": 9
                        },
                        "MaxBitrate": 6000000
                      }
                    },
                    "AfdSignaling": "NONE",
                    "DropFrameTimecode": "ENABLED",
                    "RespondToAfd": "NONE",
                    "ColorMetadata": "INSERT",
                    "Width": 1920,
                    "Height": 1080
                  },
                  "OutputSettings": {
                    "HlsSettings": {
                      "AudioGroupId": "program_audio",
                      "IFrameOnlyManifest": "EXCLUDE",
                      "AudioOnlyContainer": "AUTOMATIC",
                      "AudioRenditionSets": "program_audio"
                    }
                  },
                  "ContainerSettings": {
                    "Container": "M3U8",
                    "M3u8Settings": {
                      "AudioFramesPerPes": 4,
                      "PcrControl": "PCR_EVERY_PES_PACKET",
                      "PmtPid": 480,
                      "PrivateMetadataPid": 503,
                      "ProgramNumber": 1,
                      "PatInterval": 0,
                      "PmtInterval": 0,
                      "Scte35Source": "NONE",
                      "NielsenId3": "NONE",
                      "TimedMetadata": "NONE",
                      "VideoPid": 481,
                      "AudioPids": [
                        482,
                        483,
                        484,
                        485,
                        486,
                        487,
                        488,
                        489,
                        490,
                        491,
                        492
                      ]
                    }
                  },
                  "NameModifier": "_video"
                },
                {
                  "AudioDescriptions": [
                    {
                      "AudioTypeControl": "FOLLOW_INPUT",
                      "CodecSettings": {
                        "Codec": "AAC",
                        "AacSettings": {
                          "AudioDescriptionBroadcasterMix": "NORMAL",
                          "Bitrate": 96000,
                          "RateControlMode": "CBR",
                          "CodecProfile": "LC",
                          "CodingMode": "CODING_MODE_2_0",
                          "RawFormat": "NONE",
                          "SampleRate": 48000,
                          "Specification": "MPEG4"
                        }
                      },
                      "LanguageCodeControl": "USE_CONFIGURED",
                      "AudioSourceName": "Audio Selector 1",
                      "StreamName": "Espanol_Polly",
                      "LanguageCode": threeLetterLanguageCode
                    }
                  ],
                  "OutputSettings": {
                    "HlsSettings": {
                      "AudioGroupId": "program_audio",
                      "IFrameOnlyManifest": "EXCLUDE",
                      "AudioOnlyContainer": "AUTOMATIC",
                      "AudioTrackType": "ALTERNATE_AUDIO_AUTO_SELECT_DEFAULT"
                    }
                  },
                  "ContainerSettings": {
                    "Container": "M3U8",
                    "M3u8Settings": {
                      "AudioFramesPerPes": 4,
                      "PcrControl": "PCR_EVERY_PES_PACKET",
                      "PmtPid": 480,
                      "PrivateMetadataPid": 503,
                      "ProgramNumber": 1,
                      "PatInterval": 0,
                      "PmtInterval": 0,
                      "Scte35Source": "NONE",
                      "NielsenId3": "NONE",
                      "TimedMetadata": "NONE",
                      "VideoPid": 481,
                      "AudioPids": [
                        482,
                        483,
                        484,
                        485,
                        486,
                        487,
                        488,
                        489,
                        490,
                        491,
                        492
                      ]
                    }
                  },
                  "NameModifier": "_audio_spa"
                },
                {
                  "NameModifier": "_captions-spa",
                  "ContainerSettings": {
                    "Container": "M3U8",
                    "M3u8Settings": {
                      "AudioFramesPerPes": 4,
                      "PcrControl": "PCR_EVERY_PES_PACKET",
                      "PmtPid": 480,
                      "PrivateMetadataPid": 503,
                      "ProgramNumber": 1,
                      "PatInterval": 0,
                      "PmtInterval": 0,
                      "VideoPid": 481,
                      "AudioPids": [
                        482,
                        483,
                        484,
                        485,
                        486,
                        487,
                        488,
                        489,
                        490,
                        491,
                        492,
                        493,
                        494,
                        495,
                        496,
                        497,
                        498
                      ]
                    }
                  },
                  "CaptionDescriptions": [
                    {
                      "DestinationSettings": {
                        "DestinationType": "WEBVTT"
                      },
                      "CaptionSelectorName": "Captions Selector 1",
                      "LanguageCode": threeLetterLanguageCode,
                      "LanguageDescription": languageName
                    }
                  ]
                }
              ]
            }
          ]
        },
        "Queue": "arn:aws:mediaconvert:us-east-1:963778699255:queues/Default",
        "Role": "arn:aws:iam::963778699255:role/MediaConvertRoleAWSDefined"
      }
      
      new AWS.MediaConvert({apiVersion: '2017-08-29'}).createJob(mediaConvertParams, function (err,data) {
          if (err) {
            console.log(err);
          }
          else {
            console.log(data);
          }
          
      });
   

}