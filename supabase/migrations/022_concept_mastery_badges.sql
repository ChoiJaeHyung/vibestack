INSERT INTO badges (slug, name, description, icon, condition_type, condition_value)
VALUES
  ('concept_master_5', '개념 마스터', '5개의 개념을 마스터했어요', '🎯', 'concept_mastery_total', 5),
  ('concept_master_20', '지식의 탑', '20개의 개념을 마스터했어요', '🏰', 'concept_mastery_total', 20)
ON CONFLICT (slug) DO NOTHING;
