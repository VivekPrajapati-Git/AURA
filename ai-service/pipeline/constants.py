from models.schemas import IntentLabel

# Generic intent signals for any topic domain
INTENT_SIGNALS = {
    IntentLabel.advice_seeking:      "advice recommend suggestion should could try consider",
    IntentLabel.information_request: "what when where why how facts information explain tell",
    IntentLabel.opinion_discussion:  "think believe opinion perspective view stance argument",
    IntentLabel.problem_solving:     "help solve problem issue fix stuck error trouble wrong",
    IntentLabel.learning_request:    "learn understand learn teach explain how works tutorial",
    IntentLabel.debate_argument:     "debate argue disagree claim evidence prove why correct",
    IntentLabel.creative_help:       "create write generate come up with idea suggest design",
    IntentLabel.decision_making:     "choose decide pick best option better alternative compare",
    IntentLabel.venting_support:     "frustrated angry upset disappointed unhappy feel bad tough",
    IntentLabel.comparison_analysis: "compare contrast difference similarity versus alternative both",
    IntentLabel.general_question:    "what ask curious wonder inquire know question",
    IntentLabel.task_assistance:     "help complete do perform build make execute run implement",
}

# Minimum response length per intent (flexible for any domain)
MIN_TOKENS = {
    IntentLabel.advice_seeking:      70,
    IntentLabel.information_request: 60,
    IntentLabel.opinion_discussion:  80,
    IntentLabel.problem_solving:     80,
    IntentLabel.learning_request:    100,
    IntentLabel.debate_argument:     90,
    IntentLabel.creative_help:       70,
    IntentLabel.decision_making:     80,
    IntentLabel.venting_support:     60,
    IntentLabel.comparison_analysis: 80,
    IntentLabel.general_question:    50,
    IntentLabel.task_assistance:     70,
}