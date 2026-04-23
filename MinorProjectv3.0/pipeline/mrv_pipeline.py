import hashlib
import json
import numpy as np

# Constants
CARBON_PER_HECTARE = 1000


def calculate_area(pixel_count):
    return (pixel_count * 625) / 10000


def calculate_carbon(area):
    return area * CARBON_PER_HECTARE


def classify_risk(change):
    if change < -50:
        return "Severe Loss"
    elif change < 0:
        return "Moderate Loss"
    elif change > 50:
        return "Significant Gain"
    else:
        return "Stable"


def generate_hash(data):
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()


def process_data(prev_carbon=0):
    # MOCK DATA (safe for demo)
    print("Using mock satellite data...")

    data = np.random.choice([0, 1], size=(100, 100), p=[0.7, 0.3])

    # Count mangrove pixels
    pixel_count = np.sum(data == 1)

    # MRV Calculations
    area = calculate_area(pixel_count)
    carbon = calculate_carbon(area)
    change = carbon - prev_carbon
    risk = classify_risk(change)
    credits = max(change, 0)

    result = {
        "area_hectares": round(area, 2),
        "carbon_tons": round(carbon, 2),
        "carbon_change": round(change, 2),
        "risk_classification": risk,
        "credits_issued": round(credits, 2)
    }

    # Blockchain hash
    result["blockchain_hash"] = generate_hash(result)

    return result


if __name__ == "__main__":
    print("MRV PIPELINE STARTED\n")

    output = process_data()

    print("\n===== MRV OUTPUT =====")
    print(json.dumps(output, indent=2))

    print("\nPIPELINE EXECUTED SUCCESSFULLY")