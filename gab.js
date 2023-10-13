zeeschuimer.register_module(
    'Gab',
    'gab.com',
    function (response, source_platform_url, source_url) {
        let domain = source_platform_url.split("/")[2].toLowerCase().replace(/^www\./, '');

        // Check if the domain is Gab
        if (!["gab.com"].includes(domain)) {
            return [];
        }

        let data;
        let posts = [];
        try {
            data = JSON.parse(response);
        } catch (SyntaxError) {
            return [];
        }

        // Check for the 'statuses' key, which contains the posts
        if (data.hasOwnProperty('statuses')) {
            for (let status of data['statuses']) {
                let post = {};

                post['id'] = status['id'];
                post['created_at'] = status['created_at'];
                post['content'] = status['content'];
                post['language'] = status['language'];
                post['visibility'] = status['visibility'];
                post['url'] = status['url'];

                // User data
                post['user'] = {
                    'id': status['account']['id'],
                    'username': status['account']['username'],
                    'avatar': status['account']['avatar'],
                    'profile_url': status['account']['url']
                };

                // Embedded content
                if (status.hasOwnProperty('card')) {
                    post['embedded_content'] = {
                        'url': status['card']['url'],
                        'title': status['card']['title'],
                        'description': status['card']['description'],
                        'image': status['card']['image']
                    };
                }

                posts.push(post);
            }
        }

        return posts;
    }
);