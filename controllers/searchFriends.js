const { getMongoClient } = require('../utils/database');

const searchFriends = async (req, res, next) => {
    // incoming: userId, search

    // outgoing: results or error

    let _search = '';
    let ret = {};
    ret.error = '';

    try {
        const { search } = req.body;
        _search = search.trim();
        if (_search === '') throw new Error();
    } catch (e) {
        res.locals.ret.error = 'Bad request syntax. Missing or incorrect information.'
        res.status(400).json(res.locals.ret);
        return;
    }

    try {
        const client = getMongoClient();
        await client.connect();
        const db = client.db();

        // check if search exists as a user by first name, last name, email, or username (case-insensitive)
        const users = await db.collection('Users').find({
            $or: [
                { FirstName: { $regex: new RegExp(_search, 'i') } }, // Case-insensitive regex for first name
                { LastName: { $regex: new RegExp(_search, 'i') } },  // Case-insensitive regex for last name
                { Email: { $regex: new RegExp(_search, 'i') } },     // Case-insensitive regex for email
                { Login: { $regex: new RegExp(_search, 'i') } }      // Case-insensitive regex for username
            ]
        }).toArray();

        if (users.length < 1) {
            res.locals.ret.error = _search + ' is not a user.';
            res.status(409).json(res.locals.ret);
            return;
        }

        let ids = [users[0]._id.toString(), res.locals.token.id];
        ids.sort((a, b) => {
            return a.localeCompare(b);
        });

        const requestBody = { user1: ids[0], user2: ids[1] };

        // check if there is an existing relationship
        const relationships = await db.collection('Relationships').find(requestBody).toArray();
        if(relationships.blocked == 'true'){
            res.locals.ret.error = _search + ' is blocked.';
            res.status(409).json(res.locals.ret);
            return;
        }
        if (relationships.length < 1) {
            res.locals.ret.error = _search + ' is not a friend.';
            res.status(409).json(res.locals.ret);
            return;
        } else {
            ret.firstName = users[0].FirstName;
            ret.lastName = users[0].LastName;
            ret.relationshipType = relationships[0].RelationshipType;
            ret.email = users[0].Email;

        }

    } catch (e) {
        res.locals.ret.error = 'Encountered an error while searching for friend.';
        res.status(500).json(res.locals.ret);
        return;
    }
    res.status(200).json(ret);
    return;
};

module.exports = { searchFriends };
