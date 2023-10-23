zeeschuimer.register_module(
    'Gab',
    'gab.com',
    function (response, source_platform_url, source_url) {
        let domain = source_platform_url.split("/")[2].toLowerCase().replace(/^www\./, '');

        // Check if the URL corresponds to a Gab search 
        if (
            !["gab.com"].includes(domain)
            || source_url.indexOf('search?type=status') < 0
        ) {
            return [];
        }

        let data;
        let posts = [];
        try {
            data = JSON.parse(response);
        } catch (SyntaxError) {
            return [];
        }

        if (data && data.statuses && Array.isArray(data.statuses)) {
            for (let post of data.statuses) {
                let transformedPost = {
                    id: post.id,
                    created_at: post.created_at,
                    content: post.content,
                    url: post.url,
                    account: {
                        id: post.account.id,
                        username: post.account.username,
                        display_name: post.account.display_name,
                        url: post.account.url,
                        avatar: post.account.avatar
                    }
                };
                posts.push(transformedPost);
            }
        }

        return posts;
    }
);