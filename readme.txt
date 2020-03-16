
1. To trigger the pipeline, copy a video file into a bucket called ai.conygre.com/uploads
Input file is named based on the original language 
and the desired translation. So in this case, the 
original is en-US and you want it in Spanish
eg.
myvideo__en-US__es.mp4

2. This upload triggers the first Lambda called LambdaTranscribe which transcribes the video 
and places a JSON output into transcribe.json.conygre.com:
<timestamp>myvideo__en-US__es.json

3. This JSON then needs to be converted into a subtitles file, and then translated.
This is done by the second Lambda ConvertTranscribeToSubtitle.
It creates two files:
<timestamp>myvideo__en-US__es_original.srt
<timestamp>myvideo__en-US__es_translated.srt
These files are placed into the bucket transcribe.srt.conygre.com

4. The SRT files need to be converted into SSML files. This is done by 
the third Lambda ConvertSubtitleToSSML. This creates file with the name:
<timestamp>myvideo__en-US__es_translated.ssml
Note that it is written to ignore files with the word 'original' in them
since they will not require an audio file
The file is placed into the bucket transcribe.ssml.conygre.com

5. An audio file is created based on the SSML file for the translated SSML.
This is done by the fourth Lambda called SSMLToAudio. It takes the SSML
and runs Amazon Polly to create an audio file. The audio file has the name
<timestamp>myvideo__en-US__de_translated<pollyJobId>

6. The fifth and final Lambda then runs to run a MediaConvert job using all the files created already.
