import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeToConversationParticipants1735481468000 implements MigrationInterface {
    name = 'AddCascadeToConversationParticipants1735481468000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing foreign key constraints
        await queryRunner.query(`ALTER TABLE \`conversation\` DROP FOREIGN KEY \`FK_452dcf5452f8aa5e2e117810051\``);
        await queryRunner.query(`ALTER TABLE \`conversation\` DROP FOREIGN KEY \`FK_conversation_participant1\``);
        
        // Add new foreign key constraints with CASCADE delete
        await queryRunner.query(`ALTER TABLE \`conversation\` ADD CONSTRAINT \`FK_conversation_participant1_cascade\` FOREIGN KEY (\`participant1_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`conversation\` ADD CONSTRAINT \`FK_conversation_participant2_cascade\` FOREIGN KEY (\`participant2_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop CASCADE foreign key constraints
        await queryRunner.query(`ALTER TABLE \`conversation\` DROP FOREIGN KEY \`FK_conversation_participant2_cascade\``);
        await queryRunner.query(`ALTER TABLE \`conversation\` DROP FOREIGN KEY \`FK_conversation_participant1_cascade\``);
        
        // Restore original foreign key constraints without CASCADE
        await queryRunner.query(`ALTER TABLE \`conversation\` ADD CONSTRAINT \`FK_conversation_participant1\` FOREIGN KEY (\`participant1_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`conversation\` ADD CONSTRAINT \`FK_452dcf5452f8aa5e2e117810051\` FOREIGN KEY (\`participant2_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
}

