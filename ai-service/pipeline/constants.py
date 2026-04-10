from models.schemas import IntentLabel

INTENT_SIGNALS = {
    IntentLabel.resume_review:       "resume skills experience format bullet points ATS",
    IntentLabel.salary_negotiation:  "salary offer negotiation compensation package counter",
    IntentLabel.interview_prep:      "interview question answer behavioral STAR technique",
    IntentLabel.job_search:          "job search apply portal LinkedIn company opening",
    IntentLabel.skill_gap:           "skill gap learn course certification missing technology",
    IntentLabel.career_switch:       "career change transition industry pivot new role",
    IntentLabel.bias_complaint:      "bias discrimination unfair treatment equal opportunity",
    IntentLabel.general_question:    "advice guidance information help career",
    IntentLabel.motivation:          "motivation confidence mindset burnout growth",
    IntentLabel.networking:          "network connect LinkedIn referral relationship event",
    IntentLabel.education:           "degree course certification bootcamp university study",
    IntentLabel.rejection_handling:  "rejection feedback failure resilience try again move on",
}

MIN_TOKENS = {
    IntentLabel.resume_review:      80,
    IntentLabel.salary_negotiation: 60,
    IntentLabel.interview_prep:     80,
    IntentLabel.job_search:         60,
    IntentLabel.skill_gap:          60,
    IntentLabel.career_switch:      70,
    IntentLabel.bias_complaint:     50,
    IntentLabel.general_question:   30,
    IntentLabel.motivation:         40,
    IntentLabel.networking:         50,
    IntentLabel.education:          50,
    IntentLabel.rejection_handling: 40,
}