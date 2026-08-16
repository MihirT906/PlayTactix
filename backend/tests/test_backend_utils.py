import requests

def _hit_backend_endpoint(url):
    try:
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()
            return data
        elif response.status_code == 404:
            return None
        else:
            print(f"Error {response.status_code}: {response.text}")
        return None

    except requests.exceptions.RequestException as e:
        print("Request failed:", e)
        return None

def backend_call_get_match_metadata(match_id):
    url = f"http://localhost:8000/data/match_meta?match_id={match_id}"
    return _hit_backend_endpoint(url)

def backend_call_get_match_data(match_id):# match data endpoint
    url = f"http://localhost:8000/data/match/{match_id}"
    return _hit_backend_endpoint(url)

def backend_call_fetch_chunk(start, end, match_id):
    url = f"http://localhost:8000/data/frames?match_id={match_id}&start={start}&end={end}"
    return _hit_backend_endpoint(url)

def backend_call_fetch_key_moments(match_id):
    url = f"http://localhost:8000/data/match_key_moments"
    return _hit_backend_endpoint(url)

def backend_call_fetch_pitch_overlay(start, end, match_id):
    url = f"http://localhost:8000/data/pitch_control_overlay?match_id={match_id}&start={start}&end={end}"
    return _hit_backend_endpoint(url)