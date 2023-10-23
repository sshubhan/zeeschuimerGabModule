zeeschuimer.register_module(
    'GabSearch',
    'gab.com',
    function(response, source_platform_url, source_url) {
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

        // Differentiate between regular and search results based on the URL
        if (source_url.includes('search?type=status')) {
            // Assuming the search results provide an array of posts
            if (data && Array.isArray(data)) {
                for (const item of data) {
                    let post = {};

                    post['id'] = item['id'];
                    post['created_at'] = item['created_at'];
                    post['content'] = item['content'];
                    post['language'] = item['language'];
                    post['visibility'] = item['visibility'];
                    post['url'] = item['url'];

                    // User data
                    post['user'] = {
                        'id': item['account']['id'],
                        'username': item['account']['username'],
                        'display_name': item['account']['display_name'],
                        'profile_url': item['account']['url'],
                        'avatar': item['account']['avatar']
                    };

                    posts.push(post);
                }
            }
        } 
        return posts;
    }
);
