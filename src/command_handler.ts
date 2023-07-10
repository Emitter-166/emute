 
import {
    Client,
    EmbedBuilder,
    Message,
    PermissionsBitField
} from "discord.js";
import {
    Sequelize
} from "sequelize";
import {
    GUILD_ID,
    ONE_UNIT
} from ".";

export const listen = (client: Client, sequelize: Sequelize) => {

    client.on('messageCreate', async (msg) => {
        if (!msg.member ?.permissions.has(PermissionsBitField.Flags.ModerateMembers) && !msg.member?.roles.cache.has('965922532609888302')) return;
        if (!msg.content.startsWith('!')) return;

        const args = msg.content.split(" ");

        const command = args[0];

        switch (command) {
            case "!emute":
                if (!(args.length >= 3)) {
                    wrongUsage('Usage: !emute hours userIds', msg);
                    return;
                }

                let userIds = [];

                for (let i = 2; i < args.length; i++) {
                    userIds.push(args[i].replace(/[<@>]/g, ""))
                }

                const roleId = `1126146395083116714`;

                let time = Number(args[1]);

                if (Number.isNaN(time)) {
                    wrongUsage('time must be a number', msg);
                    return;
                }

                time *= ONE_UNIT;

                for (let userId of userIds) {

                    const [model, created] = await sequelize.model('users').findOrCreate({
                        where: {
                            userId: userId,
                            roleId: roleId
                        },
                        defaults: {
                            duration: time,
                            givenAt: Date.now()
                        }
                    })

                    if (created) {
                        if (await giveRole(userId, roleId, client, Number(args[2]))) {} else {
                            wrongUsage(`Unable to give role to ${userId}`, msg);
                            await model.destroy();
                        }

                    } else {
                        const updated = await model.increment('duration', {
                            by: time
                        });
                    }
                }

                success(msg);
        }
    })
}

export const wrongUsage = async (issue: string, msg: Message) => {
    const embed = new EmbedBuilder()
        .setDescription("```markdown\n" + issue + "```");

    try {
        await msg.react('⛔');

        await msg.reply({
            embeds: [embed],
            allowedMentions: {
                repliedUser: false
            }
        });
    } catch (err) {
        console.log(err);
    }
}

export const success = async (msg: Message) => {
    try {
        msg.react('✅');
    } catch (err) {
        console.log(err);
    }
}

export const giveRole = async (userId: string, roleId: string, client: Client, time: number): Promise < boolean > => {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch(userId);

        await member.roles.add(roleId);

        const role = await guild.roles.fetch(roleId);

        try {
            const dm = await member.user.createDM();
            const embed = new EmbedBuilder()
                .setDescription(`You have been event muted for ${time} hours`);

            if (role ?.color)
                embed.setColor(role ?.color);
            await dm.send({
                embeds: [embed]
            });

        } catch (err) {
            console.log("unable to dm member: " + `userId: ${userId} user: ${member.user.username}#${member.user.discriminator}`)
        }



        return true;

    } catch (err) {
        return false;
    }

}

export const removeRole = async (userId: string, roleId: string, client: Client): Promise < boolean > => {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch(userId);

        await member.roles.remove(roleId);

        const role = await guild.roles.fetch(roleId);

        try {
            const dm = await member.user.createDM();
            const embed = new EmbedBuilder()
                .setDescription(`You are no longer event muted!`);

            if (role ?.color)
                embed.setColor(role?.color);
            await dm.send({
                embeds: [embed]
            });

        } catch (err) {
            console.log("unable to dm member: " + `userId: ${userId} user: ${member.user.username}#${member.user.discriminator}`)
        }

        return true;
    } catch (err) {
        console.log(err);
        return false;
    }

}