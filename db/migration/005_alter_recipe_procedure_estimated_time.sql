ALTER TABLE recipe_procedures
ADD COLUMN estimated_time_new TIME NULL;

UPDATE recipe_procedures
SET estimated_time_new = SEC_TO_TIME(estimated_time * 60);

ALTER TABLE recipe_procedures DROP COLUMN estimated_time;

ALTER TABLE recipe_procedures
CHANGE estimated_time_new estimated_time TIME NULL;