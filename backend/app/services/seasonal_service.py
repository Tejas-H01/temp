# Static Seasonal Reference Data lookup
# Supports the 10 core destinations: Mumbai, Goa, Jaipur, Udaipur, Delhi, Manali, Rishikesh, Kochi, Bengaluru, Varanasi.

SEASONAL_DATA = {}

# 1. Mumbai (51)
mumbai = {}
for m in [11, 12, 1, 2]:
    mumbai[m] = {"season": "Winter", "typical_conditions": "Pleasant, mild weather", "suitability": "good", "travel_tip": "Perfect time for sightseeing and exploring street food."}
for m in [3, 4, 5]:
    mumbai[m] = {"season": "Summer", "typical_conditions": "Hot and humid", "suitability": "moderate", "travel_tip": "Stay hydrated and carry sunscreen for outdoor activities."}
for m in [6, 7, 8, 9, 10]:
    mumbai[m] = {"season": "Monsoon", "typical_conditions": "Heavy rainfall, high humidity", "suitability": "not_ideal", "travel_tip": "Expect travel delays due to rain. Carry an umbrella."}
SEASONAL_DATA[51] = mumbai

# 2. Goa (15)
goa = {}
for m in [11, 12, 1, 2]:
    goa[m] = {"season": "Winter", "typical_conditions": "Cool breeze, pleasant sunny days", "suitability": "good", "travel_tip": "Perfect for beaches, water sports, and nightlife."}
for m in [3, 4, 5]:
    goa[m] = {"season": "Summer", "typical_conditions": "Hot and humid days", "suitability": "moderate", "travel_tip": "Enjoy water sports early in the day; evenings are warm."}
for m in [6, 7, 8, 9, 10]:
    goa[m] = {"season": "Monsoon", "typical_conditions": "Heavy rains, lush green landscapes", "suitability": "not_ideal", "travel_tip": "Beaches and swimming are unsafe, but great for scenic nature trips."}
SEASONAL_DATA[15] = goa

# 3. Jaipur (67) & Udaipur (72)
rajasthan_winter = {"season": "Winter", "typical_conditions": "Cool and pleasant weather", "suitability": "good", "travel_tip": "Explore historical forts and local markets comfortably."}
rajasthan_summer = {"season": "Summer", "typical_conditions": "Extremely hot and dry", "suitability": "not_ideal", "travel_tip": "Avoid afternoon outings. Carry hats and drink plenty of water."}
rajasthan_monsoon = {"season": "Monsoon", "typical_conditions": "Warm with occasional rain showers", "suitability": "moderate", "travel_tip": "Forts look beautiful in the rain, but check for muddy paths."}

jaipur = {}
udaipur = {}
for m in [10, 11, 12, 1, 2, 3]:
    jaipur[m] = rajasthan_winter
    udaipur[m] = rajasthan_winter
for m in [4, 5, 6]:
    jaipur[m] = rajasthan_summer
    udaipur[m] = rajasthan_summer
for m in [7, 8, 9]:
    jaipur[m] = rajasthan_monsoon
    udaipur[m] = rajasthan_monsoon
SEASONAL_DATA[67] = jaipur
SEASONAL_DATA[72] = udaipur

# 4. Delhi (6, 8, 9)
delhi = {}
for m in [10, 11, 12, 1, 2, 3]:
    delhi[m] = {"season": "Winter", "typical_conditions": "Chilly days, dense morning fog", "suitability": "good", "travel_tip": "Perfect for exploring street food and heritage walks."}
for m in [4, 5, 6]:
    delhi[m] = {"season": "Summer", "typical_conditions": "Extremely hot and dry (Loo)", "suitability": "not_ideal", "travel_tip": "Stay indoors during mid-day heat. Stay hydrated."}
for m in [7, 8, 9]:
    delhi[m] = {"season": "Monsoon", "typical_conditions": "Humid with moderate to heavy rains", "suitability": "moderate", "travel_tip": "Occasional waterlogging might cause traffic delays."}
SEASONAL_DATA[6] = delhi
SEASONAL_DATA[8] = delhi
SEASONAL_DATA[9] = delhi

# 5. Manali (25)
manali = {}
for m in [10, 11, 12, 1, 2]:
    manali[m] = {"season": "Winter", "typical_conditions": "Very cold, heavy snowfall", "suitability": "good", "travel_tip": "Great for snow activities and skiing. Carry heavy woolens."}
for m in [3, 4, 5, 6]:
    manali[m] = {"season": "Summer", "typical_conditions": "Pleasant and cool climate", "suitability": "good", "travel_tip": "Ideal for trekking, paragliding, and sightseeing."}
for m in [7, 8, 9]:
    manali[m] = {"season": "Monsoon", "typical_conditions": "Heavy rains, landslide risk", "suitability": "not_ideal", "travel_tip": "Check highway updates before traveling due to landslide risks."}
SEASONAL_DATA[25] = manali

# 6. Rishikesh (99)
rishikesh = {}
for m in [10, 11, 12, 1, 2, 3]:
    rishikesh[m] = {"season": "Winter", "typical_conditions": "Cool days, cold nights", "suitability": "good", "travel_tip": "Excellent time for rafting, camping, and yoga retreats."}
for m in [4, 5, 6]:
    rishikesh[m] = {"season": "Summer", "typical_conditions": "Warm days, pleasant evenings", "suitability": "moderate", "travel_tip": "River activities are refreshing. Carry light clothes."}
for m in [7, 8, 9]:
    rishikesh[m] = {"season": "Monsoon", "typical_conditions": "Heavy rain, high river flow", "suitability": "not_ideal", "travel_tip": "Rafting is closed due to high water levels. Avoid landslides."}
SEASONAL_DATA[99] = rishikesh

# 7. Kochi (38)
kochi = {}
for m in [10, 11, 12, 1, 2]:
    kochi[m] = {"season": "Winter", "typical_conditions": "Pleasant and moderate weather", "suitability": "good", "travel_tip": "Great for backwater cruises and sightseeing."}
for m in [3, 4, 5]:
    kochi[m] = {"season": "Summer", "typical_conditions": "Hot and highly humid", "suitability": "moderate", "travel_tip": "Wear light cottons. Evenings near the coast are pleasant."}
for m in [6, 7, 8, 9]:
    kochi[m] = {"season": "Monsoon", "typical_conditions": "Very heavy rainfall", "suitability": "not_ideal", "travel_tip": "Explore Ayurvedic rejuvenation therapies indoors."}
SEASONAL_DATA[38] = kochi

# 8. Bangalore (29)
bangalore = {}
for m in [10, 11, 12, 1, 2]:
    bangalore[m] = {"season": "Winter", "typical_conditions": "Cool and pleasant throughout", "suitability": "good", "travel_tip": "Ideal for walking tours and visiting gardens."}
for m in [3, 4, 5]:
    bangalore[m] = {"season": "Summer", "typical_conditions": "Warm days, breezy evenings", "suitability": "moderate", "travel_tip": "Sightseeing is best in the morning and evening."}
for m in [6, 7, 8, 9]:
    bangalore[m] = {"season": "Monsoon", "typical_conditions": "Pleasant temperatures, regular showers", "suitability": "good", "travel_tip": "Carry an umbrella or light jacket for sudden showers."}
SEASONAL_DATA[29] = bangalore

# 9. Varanasi (89)
varanasi = {}
for m in [10, 11, 12, 1, 2, 3]:
    varanasi[m] = {"season": "Winter", "typical_conditions": "Cold, pleasant afternoon sunshine", "suitability": "good", "travel_tip": "Perfect for morning boat rides and Ganga Aarti."}
for m in [4, 5, 6]:
    varanasi[m] = {"season": "Summer", "typical_conditions": "Scorching heat", "suitability": "not_ideal", "travel_tip": "Perform activities in early morning or late evening."}
for m in [7, 8, 9]:
    varanasi[m] = {"season": "Monsoon", "typical_conditions": "Humid with frequent rain", "suitability": "moderate", "travel_tip": "Ghats might be flooded. Check boat safety guidelines."}
SEASONAL_DATA[89] = varanasi


def get_seasonal_conditions(city_id: int, month: int) -> dict:
    """
    Returns the seasonal travel conditions for a given city and month.
    Validates month and resolves city to a deterministic seasonal data map.
    """
    if month < 1 or month > 12:
        raise ValueError("Month must be an integer between 1 and 12.")

    # Try looking up in the static mapping
    city_data = SEASONAL_DATA.get(city_id)
    if city_data and month in city_data:
        return city_data[month]

    # Graceful fallback if no data exists
    return {
        "season": "Unknown",
        "typical_conditions": "Seasonal conditions data not available.",
        "suitability": "moderate",
        "travel_tip": "Please check local conditions before travelling."
    }
