import requests

url = 'https://gamebanana.com/dl/1202942'
filename = 'test_python_download_2.zip'
response = requests.get(url)


with open(filename, 'wb') as file:
    file.write(response.content)

print(f"Downloaded {filename} from {url}")