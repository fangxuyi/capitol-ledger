DELETE FROM `tracked_members` WHERE `id` = 'james-lankford';
--> statement-breakpoint
INSERT INTO `tracked_members` (`id`, `first_name`, `last_name`, `display_name`, `chamber`, `state_district`, `active`) VALUES
  ('james-langevin', 'James R.', 'Langevin', 'James R. Langevin', 'house', 'RI02', true)
ON CONFLICT (`id`) DO UPDATE SET
  `first_name` = excluded.`first_name`,
  `last_name` = excluded.`last_name`,
  `display_name` = excluded.`display_name`,
  `chamber` = excluded.`chamber`,
  `state_district` = excluded.`state_district`,
  `active` = true;
