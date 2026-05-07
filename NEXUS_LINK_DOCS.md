# Nexus Link SDK Documentation

The Nexus Link SDK allows developers to protect their software by verifying that the user has a legitimate license purchased from NexusShop.

## How it Works

Nexus Link uses a **Product API Key** (unique to your app) and a **Personal License Token** (unique to the user) to verify ownership.

1.  **Developer**: Gets a `Product API Key` from the Product Page on NexusShop.
2.  **User**: Generates a `Personal License Token` from their Account Settings.
3.  **App**: Prompts the user for their token and calls the Nexus Link API to verify it.

## API Endpoint

**URL**: `POST http://localhost:5000/api/sdk/v1/verify`
**Content-Type**: `application/json`

### Request Body

| Field | Type | Description |
| :--- | :--- | :--- |
| `productApiKey` | String | Your app's unique secret key. |
| `userToken` | String | The license token provided by the user. |

### Response (Success)

```json
{
  "valid": true,
  "licenseStatus": "OWNED",
  "productTitle": "Nova Analytics Pro",
  "userName": "user@example.com",
  "timestamp": "2026-04-29T12:00:00.000Z"
}
```

### Response (Failure)

```json
{
  "valid": false,
  "licenseStatus": "NOT_OWNED",
  "error": "User has not purchased this product"
}
```

---

## Implementation Examples

### Node.js (JavaScript)

```javascript
async function checkLicense(token) {
  try {
    const response = await fetch('http://localhost:5000/api/sdk/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productApiKey: 'YOUR_PRODUCT_API_KEY',
        userToken: token
      })
    });
    
    const result = await response.json();
    if (result.valid) {
      console.log('License valid for:', result.userName);
      return true;
    } else {
      console.error('License error:', result.error);
      return false;
    }
  } catch (err) {
    console.error('Failed to connect to Nexus Link');
    return false;
  }
}
```

### Python

```python
import requests

def verify_license(user_token):
    url = "http://localhost:5000/api/sdk/v1/verify"
    payload = {
        "productApiKey": "YOUR_PRODUCT_API_KEY",
        "userToken": user_token
    }
    
    try:
        response = requests.post(url, json=payload)
        data = response.json()
        
        if response.status_code == 200 and data.get("valid"):
            print(f"Verified: {data.get('userName')}")
            return True
        else:
            print(f"Error: {data.get('error')}")
            return False
    except Exception as e:
        print("Network error")
        return False
```

### C# (.NET)

```csharp
using System.Net.Http;
using System.Text.Json;
using System.Text;

public async Task<bool> VerifyLicense(string userToken) {
    var client = new HttpClient();
    var payload = new {
        productApiKey = "YOUR_PRODUCT_API_KEY",
        userToken = userToken
    };

    var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
    
    try {
        var response = await client.PostAsync("http://localhost:5000/api/sdk/v1/verify", content);
        var responseString = await response.Content.ReadAsStringAsync();
        var result = JsonDocument.Parse(responseString).RootElement;

        return result.GetProperty("valid").GetBoolean();
    } catch {
        return false;
    }
}
```

### C++ (using cURL)

```cpp
#include <iostream>
#include <string>
#include <curl/curl.h>

size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    ((std::string*)userp)->append((char*)contents, size * nmemb);
    return size * nmemb;
}

bool verifyLicense(std::string userToken) {
    CURL* curl;
    CURLcode res;
    std::string readBuffer;

    curl = curl_easy_init();
    if(curl) {
        curl_easy_setopt(curl, CURLOPT_URL, "http://localhost:5000/api/sdk/v1/verify");
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        
        std::string json = "{\"productApiKey\":\"YOUR_PRODUCT_API_KEY\",\"userToken\":\"" + userToken + "\"}";
        
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);
        
        res = curl_easy_perform(curl);
        curl_easy_cleanup(curl);

        return (res == CURLE_OK && readBuffer.find("\"valid\":true") != std::string::npos);
    }
    return false;
}
```

---

## Best Practices

1.  **Server-Side Verification**: Always perform verification on a backend server if your app has one.
2.  **Obfuscation**: If you verify on the client (e.g., in a desktop app), obfuscate your code and use anti-debugging techniques to make it harder to bypass the check.
3.  **Caching**: Cache the `valid` status locally (e.g., in an encrypted file or registry) to allow offline use, but re-verify periodically.
4.  **Graceful Failure**: If the NexusShop server is down, decide whether to allow the user in or block them (Fail-Open vs Fail-Closed).
