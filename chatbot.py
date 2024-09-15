import requests
import sys
import io

# Force stdout to use utf-8 encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

API_KEY = 'AIzaSyBXVIHu9HbPK6Gcm9iOGfZjagvQfJN4XPo'  # Replace with your actual API key
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'

def get_chatbot_response(message):
    headers = {
        'Content-Type': 'application/json',
    }

    data = {
        'contents': [
            {
                'parts': [
                    {'text': f"Reply as if you're chatting casually with a girlfriend you are saurabh and she is ritika you can flirt at times in WhatsApp. Respond in Hinglish (mix of Hindi and English), in one or two lines only. Message to respond to: {message}"}
                ]
            }
        ]
    }

    try:
        response = requests.post(f'{GEMINI_API_URL}?key={API_KEY}', headers=headers, json=data)
        response.raise_for_status()
        json_response = response.json()

        reply = json_response.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '').strip()
        return reply  

    except requests.exceptions.RequestException as e:
        return f"Error fetching reply: {str(e)}"

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(1)

    user_message = sys.argv[1]
    chatbot_reply = get_chatbot_response(user_message)
    print(chatbot_reply)
