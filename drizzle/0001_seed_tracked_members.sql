INSERT INTO `tracked_members` (`id`, `first_name`, `last_name`, `display_name`, `chamber`, `state_district`, `active`) VALUES
  ('nancy-pelosi', 'Nancy', 'Pelosi', 'Nancy Pelosi', 'house', 'CA', true),
  ('james-lankford', 'James', 'Lankford', 'James Lankford', 'senate', 'OK', true),
  ('ed-perlmutter', 'Ed', 'Perlmutter', 'Ed Perlmutter', 'house', 'CO07', true),
  ('marjorie-greene', 'Marjorie Taylor', 'Greene', 'Marjorie Taylor Greene', 'house', 'GA14', true),
  ('dean-phillips', 'Dean', 'Phillips', 'Dean Phillips', 'house', 'MN03', true),
  ('john-james', 'John', 'James', 'John James', 'house', 'MI10', true),
  ('carol-miller', 'Carol Devine', 'Miller', 'Carol Devine Miller', 'house', 'WV', true),
  ('gary-palmer', 'Gary', 'Palmer', 'Gary Palmer', 'house', 'AL06', true),
  ('daniel-crenshaw', 'Daniel', 'Crenshaw', 'Daniel Crenshaw', 'house', 'TX02', true)
ON CONFLICT (`id`) DO UPDATE SET
  `first_name` = excluded.`first_name`,
  `last_name` = excluded.`last_name`,
  `display_name` = excluded.`display_name`,
  `chamber` = excluded.`chamber`,
  `state_district` = excluded.`state_district`,
  `active` = true;
