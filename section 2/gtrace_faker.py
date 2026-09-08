from faker import Faker
import random
import json
import os
from datetime import datetime, timedelta

fake = Faker("en_IN")

random.seed(42)
Faker.seed(42)

DATA_FOLDER = "data"

if not os.path.exists(DATA_FOLDER):
    os.makedirs(DATA_FOLDER)

people = [
    {
        "person_id": "P001",
        "name": "Arjun Malhotra",
        "role": "Key Person"
    },
    {
        "person_id": "P002",
        "name": "Ravi Sharma",
        "role": "Associate"
    },
    {
        "person_id": "P003",
        "name": "Vikram Das",
        "role": "Associate"
    },
    {
        "person_id": "P004",
        "name": "Sameer Khan",
        "role": "Associate"
    },
    {
        "person_id": "P005",
        "name": "Nitin Roy",
        "role": "Associate"
    },
    {
        "person_id": "P006",
        "name": "Amit Verma",
        "role": "Associate"
    },
    {
        "person_id": "P007",
        "name": "Suresh Yadav",
        "role": "Associate"
    },
    {
        "person_id": "P008",
        "name": "Rahul Sen",
        "role": "Unrelated"
    },
    {
        "person_id": "P009",
        "name": "Priya Mehta",
        "role": "Unrelated"
    },
    {
        "person_id": "P010",
        "name": "Ankit Bose",
        "role": "Unrelated"
    }
]

phone_numbers = {
    "Arjun Malhotra": "9000001001",
    "Ravi Sharma": "9000001002",
    "Vikram Das": "9000001003",
    "Sameer Khan": "9000001004",
    "Nitin Roy": "9000001005",
    "Amit Verma": "9000001006",
    "Suresh Yadav": "9000001007",
    "Rahul Sen": "9000001008",
    "Priya Mehta": "9000001009",
    "Ankit Bose": "9000001010"
}

locations = [
    "Kolkata",
    "Howrah",
    "Durgapur",
    "Siliguri",
    "Asansol",
    "Mumbai",
    "Delhi",
    "Patna"
]

vehicles = [
    "WB02AB4521",
    "WB06CD7832",
    "WB12EF2198",
    "WB24GH6610",
    "WB10JK9034"
]

organizations = [
    "Eastern Logistics",
    "Metro Traders",
    "Royal Transport Services",
    "City Wholesale",
    "North Bengal Suppliers"
]

network = {
    "Arjun Malhotra": [
        "Ravi Sharma",
        "Vikram Das",
        "Sameer Khan"
    ],
    "Ravi Sharma": [
        "Nitin Roy"
    ],
    "Vikram Das": [
        "Amit Verma"
    ],
    "Sameer Khan": [
        "Suresh Yadav"
    ]
}

def random_date():
    start_date = datetime(2026, 1, 1)
    end_date = datetime(2026, 8, 31)

    number_of_days = (end_date - start_date).days

    random_days = random.randint(0, number_of_days)

    date = start_date + timedelta(days=random_days)

    return date.strftime("%Y-%m-%d")

def random_time():
    hour = random.randint(8, 22)

    minute = random.choice([
        0,
        10,
        20,
        30,
        40,
        50
    ])

    return f"{hour:02d}:{minute:02d}"

def generate_case_id(number):
    return f"CASE-2026-{number:04d}"

def generate_report_id(number):
    return f"REP-{number:04d}"

person_details = {}

for person in people:
    name = person["name"]

    person_details[name] = {
        "person_id": person["person_id"],
        "name": name,
        "role": person["role"],
        "phone": phone_numbers[name],
        "address": fake.address().replace("\n", ", "),
        "city": random.choice(locations)
    }

documents = []

documents.append({
    "report_id": generate_report_id(1),
    "case_id": generate_case_id(1),
    "type": "FIR",
    "date": "2026-01-15",
    "location": "Howrah",
    "text":
        "Arjun Malhotra was reportedly seen meeting "
        "Ravi Sharma near Howrah Railway Station. "
        "Vehicle WB02AB4521 was observed at the location."
})

documents.append({
    "report_id": generate_report_id(2),
    "case_id": generate_case_id(1),
    "type": "Surveillance Report",
    "date": "2026-01-21",
    "location": "Kolkata",
    "text":
        "Ravi Sharma was observed meeting Nitin Roy "
        "in Kolkata. Vehicle WB06CD7832 was associated "
        "with the meeting."
})

documents.append({
    "report_id": generate_report_id(3),
    "case_id": generate_case_id(1),
    "type": "Surveillance Report",
    "date": "2026-02-03",
    "location": "Durgapur",
    "text":
        "Arjun Malhotra and Vikram Das were observed "
        "meeting near a warehouse in Durgapur."
})

documents.append({
    "report_id": generate_report_id(4),
    "case_id": generate_case_id(1),
    "type": "Police Report",
    "date": "2026-02-12",
    "location": "Asansol",
    "text":
        "Vikram Das was seen communicating with "
        "Amit Verma near Asansol. "
        "Vehicle WB12EF2198 was present."
})

documents.append({
    "report_id": generate_report_id(5),
    "case_id": generate_case_id(1),
    "type": "FIR",
    "date": "2026-02-22",
    "location": "Kolkata",
    "text":
        "Sameer Khan and Arjun Malhotra were reportedly "
        "seen together near a commercial warehouse "
        "in Kolkata."
})

documents.append({
    "report_id": generate_report_id(6),
    "case_id": generate_case_id(1),
    "type": "Surveillance Report",
    "date": "2026-03-05",
    "location": "Siliguri",
    "text":
        "Sameer Khan was observed meeting Suresh Yadav "
        "in Siliguri. The meeting lasted approximately "
        "forty minutes."
})

documents.append({
    "report_id": generate_report_id(7),
    "case_id": generate_case_id(1),
    "type": "Financial Report",
    "date": "2026-03-14",
    "location": "Kolkata",
    "text":
        "A transaction involving Arjun Malhotra and "
        "Eastern Logistics was recorded in Kolkata."
})

documents.append({
    "report_id": generate_report_id(8),
    "case_id": generate_case_id(1),
    "type": "Financial Report",
    "date": "2026-03-20",
    "location": "Kolkata",
    "text":
        "Ravi Sharma was linked to Metro Traders "
        "through transactions recorded in Kolkata."
})

documents.append({
    "report_id": generate_report_id(9),
    "case_id": generate_case_id(1),
    "type": "Surveillance Report",
    "date": "2026-04-02",
    "location": "Durgapur",
    "text":
        "Arjun Malhotra, Vikram Das and Sameer Khan "
        "were reported in the same area of Durgapur."
})

documents.append({
    "report_id": generate_report_id(10),
    "case_id": generate_case_id(1),
    "type": "Police Report",
    "date": "2026-04-15",
    "location": "Howrah",
    "text":
        "Nitin Roy and Ravi Sharma were identified "
        "during an investigation in Howrah."
})

documents.append({
    "report_id": generate_report_id(11),
    "case_id": generate_case_id(2),
    "type": "Police Report",
    "date": "2026-04-23",
    "location": "Mumbai",
    "text":
        "Rahul Sen was questioned regarding an unrelated "
        "incident in Mumbai."
})

documents.append({
    "report_id": generate_report_id(12),
    "case_id": generate_case_id(3),
    "type": "Police Report",
    "date": "2026-05-04",
    "location": "Delhi",
    "text":
        "Priya Mehta was reported near a commercial "
        "location in Delhi. No connection with the "
        "primary investigation was established."
})

documents.append({
    "report_id": generate_report_id(13),
    "case_id": generate_case_id(4),
    "type": "Police Report",
    "date": "2026-05-17",
    "location": "Patna",
    "text":
        "Ankit Bose appeared in a separate report "
        "concerning an unrelated incident in Patna."
})

network_people = [
    "Arjun Malhotra",
    "Ravi Sharma",
    "Vikram Das",
    "Sameer Khan",
    "Nitin Roy",
    "Amit Verma",
    "Suresh Yadav"
]

report_types = [
    "FIR",
    "Police Report",
    "Surveillance Report",
    "Financial Report"
]

for i in range(14, 31):

    person1 = random.choice(network_people)

    person2 = random.choice(network_people)

    while person1 == person2:
        person2 = random.choice(network_people)

    location = random.choice(locations[:5])

    vehicle = random.choice(vehicles)

    report_type = random.choice(report_types)

    text_templates = [
        f"{person1} was observed meeting "
        f"{person2} in {location}.",

        f"Investigators recorded an interaction "
        f"between {person1} and {person2} in "
        f"{location}.",

        f"{person1} and {person2} were seen "
        f"together near a commercial location "
        f"in {location}.",

        f"Surveillance information placed "
        f"{person1} and {person2} in the same "
        f"area of {location}. Vehicle {vehicle} "
        f"was also observed.",

        f"A report mentioned {person1} and "
        f"{person2} in connection with activity "
        f"recorded in {location}."
    ]

    text = random.choice(text_templates)

    documents.append({
        "report_id": generate_report_id(i),
        "case_id": generate_case_id(
            random.randint(1, 4)
        ),
        "type": report_type,
        "date": random_date(),
        "location": location,
        "text": text
    })

cdr_records = []

cdr_id = 1

for caller in network:

    for receiver in network[caller]:

        number_of_calls = random.randint(2, 5)

        for _ in range(number_of_calls):

            cdr_records.append({
                "cdr_id": f"CDR-{cdr_id:04d}",
                "caller": caller,
                "caller_phone": phone_numbers[caller],
                "receiver": receiver,
                "receiver_phone": phone_numbers[receiver],
                "date": random_date(),
                "time": random_time(),
                "duration_seconds": random.randint(20, 900),
                "location": random.choice(locations[:5])
            })

            cdr_id += 1

for _ in range(10):

    caller = random.choice(network_people)

    receiver = random.choice(network_people)

    while caller == receiver:
        receiver = random.choice(network_people)

    cdr_records.append({
        "cdr_id": f"CDR-{cdr_id:04d}",
        "caller": caller,
        "caller_phone": phone_numbers[caller],
        "receiver": receiver,
        "receiver_phone": phone_numbers[receiver],
        "date": random_date(),
        "time": random_time(),
        "duration_seconds": random.randint(10, 600),
        "location": random.choice(locations)
    })

    cdr_id += 1

transactions = []

transaction_id = 1

for sender in network:

    for receiver in network[sender]:

        for _ in range(random.randint(1, 3)):

            transactions.append({
                "transaction_id": f"TXN-{transaction_id:05d}",
                "sender": sender,
                "receiver": receiver,
                "amount": random.randint(5000, 250000),
                "date": random_date(),
                "location": random.choice(locations[:5]),
                "organization": random.choice(organizations)
            })

            transaction_id += 1

vehicle_records = []

for vehicle in vehicles:

    owner = random.choice(network_people)

    vehicle_records.append({
        "vehicle_number": vehicle,
        "associated_person": owner,
        "location": random.choice(locations[:5]),
        "last_seen": random_date()
    })

organization_records = []

for organization in organizations:

    associated_person = random.choice(network_people)

    organization_records.append({
        "organization": organization,
        "associated_person": associated_person,
        "location": random.choice(locations[:5])
    })

entities = []

for person in people:

    name = person["name"]

    entities.append({
        "entity_id": person["person_id"],
        "entity_type": "PERSON",
        "entity_name": name,
        "role": person["role"]
    })

for index, location in enumerate(locations, start=1):

    entities.append({
        "entity_id": f"L{index:03d}",
        "entity_type": "LOCATION",
        "entity_name": location
    })

for index, organization in enumerate(organizations, start=1):

    entities.append({
        "entity_id": f"O{index:03d}",
        "entity_type": "ORGANIZATION",
        "entity_name": organization
    })

for index, vehicle in enumerate(vehicles, start=1):

    entities.append({
        "entity_id": f"V{index:03d}",
        "entity_type": "VEHICLE",
        "entity_name": vehicle
    })

for index, phone in enumerate(phone_numbers.values(), start=1):

    entities.append({
        "entity_id": f"PH{index:03d}",
        "entity_type": "PHONE",
        "entity_name": phone
    })

dataset = {

    "metadata": {
        "project":
            "AI-Powered Criminal Network Analysis System",

        "dataset_type":
            "Synthetic",

        "generated_by":
            "Faker",

        "locale":
            "en_IN",

        "generated_on":
            datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S"
            ),

        "warning":
            "Synthetic data for demonstration/testing only."
    },

    "people": people,

    "person_details": person_details,

    "phone_numbers": phone_numbers,

    "locations": locations,

    "vehicles": vehicles,

    "organizations": organizations,

    "network_structure": network,

    "documents": documents,

    "cdr_records": cdr_records,

    "financial_transactions": transactions,

    "vehicle_records": vehicle_records,

    "organization_records": organization_records,

    "entities": entities
}

output_file = os.path.join(
    DATA_FOLDER,
    "mock_data.json"
)

with open(
    output_file,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        dataset,
        file,
        indent=4,
        ensure_ascii=False
    )

print()
print("=" * 60)
print("AI-POWERED CRIMINAL NETWORK ANALYSIS")
print("SYNTHETIC DATA GENERATOR")
print("=" * 60)

print()

print(
    f"People generated          : {len(people)}"
)

print(
    f"Reports generated         : {len(documents)}"
)

print(
    f"CDR records generated     : {len(cdr_records)}"
)

print(
    f"Financial transactions    : "
    f"{len(transactions)}"
)

print(
    f"Vehicles generated        : {len(vehicles)}"
)

print(
    f"Locations generated       : {len(locations)}"
)

print(
    f"Organizations generated   : "
    f"{len(organizations)}"
)

print(
    f"Total entities            : {len(entities)}"
)

print()

print("Main synthetic network:")
print()

for person, connections in network.items():

    for connection in connections:

        print(
            f"  {person}  --->  {connection}"
        )

print()

print("=" * 60)

print(
    f"Dataset saved to: {output_file}"
)

print("=" * 60)

print()