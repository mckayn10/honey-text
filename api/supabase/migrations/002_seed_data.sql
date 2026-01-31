-- Seed question sets
INSERT INTO question_sets (slug, name) VALUES
  ('couples', 'Couples'),
  ('families', 'Families'),
  ('siblings', 'Siblings'),
  ('parent_child', 'Parent & Child'),
  ('friends', 'Friends')
ON CONFLICT (slug) DO NOTHING;

-- Seed questions for Couples
INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 1, 'What is something your partner did this week that made you smile?'
FROM question_sets WHERE slug = 'couples'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 2, 'What is one thing you appreciate about your partner today?'
FROM question_sets WHERE slug = 'couples'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 3, 'What is a goal you''d like to work on together this month?'
FROM question_sets WHERE slug = 'couples'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 4, 'What is your favorite memory from this past week together?'
FROM question_sets WHERE slug = 'couples'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 5, 'What is something new you learned about your partner recently?'
FROM question_sets WHERE slug = 'couples'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

-- Seed questions for Families
INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 1, 'What is something you''re grateful for this week?'
FROM question_sets WHERE slug = 'families'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 2, 'What is one thing you learned this week?'
FROM question_sets WHERE slug = 'families'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 3, 'What made you laugh this week?'
FROM question_sets WHERE slug = 'families'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 4, 'What is something you''re looking forward to?'
FROM question_sets WHERE slug = 'families'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 5, 'What is a challenge you faced this week and how did you handle it?'
FROM question_sets WHERE slug = 'families'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

-- Seed questions for Siblings
INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 1, 'What is a favorite memory we share together?'
FROM question_sets WHERE slug = 'siblings'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 2, 'What is something you appreciate about our relationship?'
FROM question_sets WHERE slug = 'siblings'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 3, 'What is something fun we should do together soon?'
FROM question_sets WHERE slug = 'siblings'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 4, 'What is one thing happening in your life right now?'
FROM question_sets WHERE slug = 'siblings'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 5, 'What is something that made you smile this week?'
FROM question_sets WHERE slug = 'siblings'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

-- Seed questions for Parent & Child
INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 1, 'What is something you''re proud of this week?'
FROM question_sets WHERE slug = 'parent_child'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 2, 'What is a challenge you''re facing and how can I help?'
FROM question_sets WHERE slug = 'parent_child'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 3, 'What is something you learned recently that excited you?'
FROM question_sets WHERE slug = 'parent_child'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 4, 'What is something you''d like to do together soon?'
FROM question_sets WHERE slug = 'parent_child'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 5, 'What is one thing you''re grateful for today?'
FROM question_sets WHERE slug = 'parent_child'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

-- Seed questions for Friends
INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 1, 'What is something fun you did this week?'
FROM question_sets WHERE slug = 'friends'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 2, 'What is something you''re excited about?'
FROM question_sets WHERE slug = 'friends'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 3, 'What is a goal you''re working towards?'
FROM question_sets WHERE slug = 'friends'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 4, 'What is something that made you laugh recently?'
FROM question_sets WHERE slug = 'friends'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;

INSERT INTO questions (question_set_id, sort_order, body)
SELECT id, 5, 'What is something you''d like to do together soon?'
FROM question_sets WHERE slug = 'friends'
ON CONFLICT (question_set_id, sort_order) DO NOTHING;
