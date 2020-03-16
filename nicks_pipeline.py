import json
import boto3
import pysrt
from datetime import datetime, timedelta
import os
from pyssml.AmazonSpeech import AmazonSpeech
from pysrt import srtitem
from pprint import pprint

''' This Python script has the entire pipeline in one script
It has been converted into a series of Lambda functions'''


# voices
voiceid_list = {
    
    "en" : "Aditi",
    "fr" : "Mathieu",
    "es" : "Miguel",
    "ru" : "Maxim",
    "zh" : "Zhiyu",
    "ja" : "izuki",
    "pt" : "Ricardo",
    "de" : "Marlene",
    "it" : "carla",
    "tr" : "Filiz"
}

####################################
def transcribe_video():
    transcribe = boto3.client('transcribe', region_name="us-east-1")
    transcribe.start_transcription_job(
    TranscriptionJobName="NickPipelineJob",
    Media={'MediaFileUri': "http://s3.amazonaws.com/transcribe.json.conygre.com/translation.mp4"},
    MediaFormat='mp4',
    LanguageCode="en-GB",
    OutputBucketName="transcribe.json.conygre.com"
    )


# time duration threshold to split transcribed text to subtitles. 0.05 is 50 milliseconds
time_duration_threshold = 0.2

translate = boto3.client(service_name='translate')

# Pass in seconds with millisecond value. Eg: 73.045 and output is in 00:01:13,045 (SRT format)
def format_time(seconds):
    sec = timedelta(seconds=seconds)
    d = datetime(1,1,1) + sec
    s = d.strftime("%H:%M:%S,%f")
    return str(s[:-3])

def translate_text(text,source_language_code,target_language_code):
    if source_language_code == target_language_code:
        return text
    else:
        result = translate.translate_text(Text=text, 
            SourceLanguageCode=source_language_code, TargetLanguageCode=target_language_code)
        return result.get('TranslatedText')

def save_original_and_translated(json_file_name,source_language_code,target_language_code):
    with open(json_file_name) as f:
        data = json.load(f)
    
    Tuple_list=[]
        
    for word in data['results']['items']:
        if word['type'] != 'punctuation':
            current_word = str(word['alternatives'][0]['content'])
            start_time = float(word['start_time'])
            end_time = float(word['end_time'])
            confidence_value = float(word['alternatives'][0]['confidence'])
            if len(Tuple_list)==0:
                Tuple_list.append([current_word,start_time,end_time])
            else:
                last_item = Tuple_list.pop()
                old_word = last_item[0]
                old_start_time = last_item[1]
                old_end_time = last_item[2]
                old_duration = old_end_time - old_start_time
                
                if (start_time - old_end_time) > time_duration_threshold or old_word.endswith('.') :
                    Tuple_list.append(last_item)
                    Tuple_list.append([current_word,start_time,end_time])
                else:
                    current_word = old_word+' '+current_word
                    start_time = old_start_time
                    Tuple_list.append([current_word,start_time,end_time])
        else:
            last_item = Tuple_list.pop()
            old_word = last_item[0]+str(word['alternatives'][0]['content'])
            old_start_time = last_item[1]
            old_end_time = last_item[2]
            Tuple_list.append([old_word,old_start_time,old_end_time])
                    
    srt_filename_original = json_file_name.replace(".json","_original.srt")
    srt_filename_translated = json_file_name.replace(".json","_translated.srt")
    
    index=1
    with open(srt_filename_original,"w") as f1,open(srt_filename_translated,"w") as f2 :
        for item in Tuple_list:
            start = item[1]
            end = item[2]
            text = item[0]
            # file 1
            f1.write(str(index))
            f1.write("\n")
            f1.write(format_time(start))
            f1.write(' --> '),
            f1.write(format_time(end))
            f1.write("\n")
            f1.write(text)
            f1.write("\n\n")
            # file 2
            f2.write(str(index))
            f2.write("\n")
            f2.write(format_time(start))
            f2.write(' --> '),
            f2.write(format_time(end))
            f2.write("\n")
            translated_text = translate_text(text,source_language_code,target_language_code)
            f2.write(translated_text)
            f2.write("\n\n")
            
            index = index+1
            print(text)
            print(translated_text)
    
    basefilename_original = os.path.basename(srt_filename_original)
    basefilename_translated = os.path.basename(srt_filename_translated)

############################################

def get_milli_seconds(timecode):
    return (timecode.hours * 3600000 + timecode.minutes * 60000 \
    + timecode.seconds * 1000 + timecode.milliseconds)

def create_ssml(filename_translated):
    translated_subs = pysrt.open(filename_translated, encoding="latin1")
    ssml = ""
   
    with open("samples/translated_speech.ssml","w", encoding="latin1") as ssml_file:
        ssml_file.write("<speak>")
        for index,each in enumerate(translated_subs):
            subtitle_index = index+1
            content = each.text
            
            current_start = get_milli_seconds(each.start)
            previous_end = get_milli_seconds(translated_subs[index-1].end) if index > 0 else 0

            pause = current_start - previous_end

            time_duration = each.duration
            time_duration_milliseconds = get_milli_seconds(time_duration)
            # Add some buffer to time duration just to accomodate beginning and end 250
            time_duration_milliseconds = time_duration_milliseconds + 400
            time_duration_string = str(time_duration_milliseconds)+"ms"
            
            s = AmazonSpeech()
            s.pause(str(pause) + "ms")
            s.max_duration(time_duration_string,content)
            text = s.ssml(True)
            
            ssml += text
        ssml_file.write(ssml)
        ssml_file.write("</speak>")

    return "<speak>"+ssml+"</speak>"

if __name__ == "__main__":

        # transcribe the video
        transcribe_video()

        # convert the JSON transcription to SRT
        #save_original_and_translated("samples/asrOutput.json","en","es")
       
        # create an SSML for the translated one
        #ssml = create_ssml("samples/asrOutput_translated.srt")

        # run polly to create the new audio
        #polly = boto3.client("polly")
        #response = polly.synthesize_speech(
        #    OutputFormat='mp3',
        #    Text=ssml,
        #    TextType ='ssml',
        #    VoiceId=voiceid_list["es"]     
        #)
        #body = response['AudioStream'].read()
        #with open("samples\\audio_file_spanish.mp3",'wb') as file:
        #    file.write(body)
        #    file.close()