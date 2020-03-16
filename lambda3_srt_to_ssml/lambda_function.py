import json
import boto3
import pysrt
from datetime import datetime, timedelta
import os
from pyssml.AmazonSpeech import AmazonSpeech
from pysrt import srtitem
from pprint import pprint

def get_milli_seconds(timecode):
    return (timecode.hours * 3600000 + timecode.minutes * 60000 \
    + timecode.seconds * 1000 + timecode.milliseconds)


def lambda_handler(event, context):

    output_bucket_name = os.environ["OUTPUT_BUCKET"] if os.environ["OUTPUT_BUCKET"] else "transcribe.ssml.conygre.com"

    # TODO There might be two files uploaded at once (two languages), so will need to iterate through the records and do each one

    fileobj = event["Records"][0]
    input_bucket_name = str(fileobj['s3']['bucket']['name'])

    srt_file_name = str(fileobj['s3']['object']['key'])
    
    # exit function if it is an original file as we don't need an SSML file since no audio is being created
    if "original" in srt_file_name:
        return
    
    output_file_path = '/tmp/'+srt_file_name
    print ("Filename ",srt_file_name)
    
    s3 = boto3.client('s3')
    s3.download_file(input_bucket_name, srt_file_name, output_file_path)



    translated_subs = pysrt.open(output_file_path, encoding="latin1")
    ssml = ""
    with open("/tmp/"+ srt_file_name + ".ssml","w", encoding="latin1") as ssml_file:
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
    print(ssml)
    # upload file to the bucket and job done!!
    ssml_filename = srt_file_name.replace(".srt",".ssml")
    s3.upload_file("/tmp/"+ srt_file_name + ".ssml", output_bucket_name, ssml_filename)
    return {
        "statusCode": 200,
        "body": json.dumps('Hello from Lambda!')
    }