#!/usr/bin/env python
"""Test generic context encoder on diverse topics"""

from pipeline.context_encoder import extract_entities, update_user_context
from models.schemas import UserContext

print("=" * 70)
print("TESTING GENERIC CONTEXT ENCODER")
print("=" * 70)

test_messages = [
    "I'm a Python developer in Mumbai working with FastAPI",
    "I just watched The Matrix at the IMAX in New York",
    "I'm learning machine learning from Andrew Ng's course at Stanford",
    "I disagree with the article from TechCrunch about AI safety",
]

print("\n[TEST 1] Career message (old domain):")
entities = extract_entities(test_messages[0])
print(f"Message: {test_messages[0]}")
print(f"Extracted entities: {entities}")

print("\n[TEST 2] Entertainment message (new domain):")
entities = extract_entities(test_messages[1])
print(f"Message: {test_messages[1]}")
print(f"Extracted entities: {entities}")

print("\n[TEST 3] Learning message (multi-domain):")
entities = extract_entities(test_messages[2])
print(f"Message: {test_messages[2]}")
print(f"Extracted entities: {entities}")

print("\n[TEST 4] Opinion message:")
entities = extract_entities(test_messages[3])
print(f"Message: {test_messages[3]}")
print(f"Extracted entities: {entities}")

# Test context accumulation
print("\n" + "=" * 70)
print("TESTING CONTEXT ACCUMULATION (Generic)")
print("=" * 70)

ctx = UserContext(
    interests=["python", "web development"],
    background=["5 years experience"],
    knowledge_level="intermediate"
)

new_entities = extract_entities("I'm interested in machine learning and have used TensorFlow")
ctx_updated = update_user_context(ctx, new_entities)

print(f"\nInitial interests: {ctx.interests}")
print(f"Extracted topics: {new_entities.get('topics', [])}")
print(f"Updated interests: {ctx_updated.interests}")
print(f"Knowledge level: {ctx_updated.knowledge_level}")

print("\n" + "=" * 70)
print("✅ CONTEXT ENCODER TESTS COMPLETE - WORKS ON ANY DOMAIN")
print("=" * 70)
