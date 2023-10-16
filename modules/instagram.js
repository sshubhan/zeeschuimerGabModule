zeeschuimer.register_module(
    'Instagram (Posts)',
    'instagram.com',
    function (response, source_platform_url, source_url) {
        let domain = source_platform_url.split("/")[2].toLowerCase().replace(/^www\./, '');
        let endpoint = source_url.split("/").slice(3).join("/").split("?")[0].split("#")[0].replace(/\/$/, '');

        if (!["instagram.com"].includes(domain)) {
            return [];
        }

        let whitelisted_endpoints = [
            "graphql/query", //live-loading @ front page
            "api/v1/collections/list",
            "api/v1/feed/user/33646200", //live-loading @ user page
            "api/v1/tags/blessed/sections", //live-loading @ tag explore page
            "api/v1/locations/214262158/sections", //live-loading @ location explore page
        ]

        /*if(!whitelisted_endpoints.includes(endpoint)) {
            return [];
        }*/

        // determine what part of instagram we're working in
        let path = source_platform_url.split("/");
        let view = "";
        if(path.length === 3) {
            view = "frontpage";
        } else if(["direct", "account", "directory", "lite", "legal"].includes(path[3])) {
            // not post listings
            return [];
        } else if(path[3] === "explore") {
            // hashtag, location view
            view = "search";
        } else {
            view = "user";
        }


        let data;
        try {
            // if it's JSON already, just parse it
            data = JSON.parse(response);
        } catch (SyntaxError) {
            // data can be embedded in the HTML in either of these two JavaScript statements
            // if the second is present, it overrides the first
            let js_prefixes = ["window._sharedData = {", "window.__additionalDataLoaded('feed',{", "window.__additionalDataLoaded('feed_v2',{"];
            let prefix;

            while(js_prefixes.length > 0) {
                prefix = js_prefixes.shift();
                if (response.indexOf(prefix) === -1) {
                    continue
                }

                let json_bit = response.split(prefix.slice(0, -1))[1].split(';</script>')[0];
                if(prefix.indexOf("additionalDataLoaded") !== -1) {
                    // remove trailing )
                    json_bit = json_bit.slice(0, -1);
                }
                try {
                    data = JSON.parse(json_bit);
                } catch (SyntaxError) {
                }

                // we go through all prefixes even if we already found one,
                // because one overrides the other
            }

            if(!data) {
                return [];
            }
        }

        let possible_edges = ["edge_owner_to_timeline_media", "edge_web_feed_timeline"];
        let possible_item_lists = ["medias", "feed_items"];
        let edges = [];

        // find edge lists in the extracted JSON data
        // these are basically any property with a name as defined above in
        // possible_edges - since instagram has all kinds of API responses
        // a generic approach works best
        let traverse = function(obj) {
            for(let property in obj) {
                if(!obj.hasOwnProperty(property)) {
                    // not actually a property
                    continue;
                }

                // pages not covered:
                // - explore (e.g. https://www.instagram.com/explore/)
                // - 'tagged' pages for a user (e.g. https://www.instagram.com/steveo/tagged/)
                // these do not load enough post metadata (e.g. author or caption), so too different from other items
                // to parse
                // - suggested posts on user feed
                // these could easily be included... may add in the future

                if(possible_item_lists.includes(property) || property == "items") {
                    // - posts on user profile pages, but only their 'front page' (e.g. https://www.instagram.com/steveo/)
                    // - posts on explore pages for specific tags (e.g. https://www.instagram.com/explore/tags/blessed/)
                    // - posts on explore pages for locations (e.g. https://www.instagram.com/explore/locations/238875664/switzerland/)
                    // - posts when opened by clicking on them
                    let items;
                    if (property === "medias") {
                        items = obj[property].map(media => media["media"]);
                    } else if (property === "feed_items") {
                        items = obj[property].map(media => media["media_or_ad"]);
                    } else {
                        items = obj[property];
                    }

                    // simple item lists
                    // this could be more robust...
                    if (items) {
                        edges.push(...items.filter(item => {
                            return (
                                item
                                && "id" in item
                                && "media_type" in item
                                && "user" in item
                                && "caption" in item
                                && (!("product_type" in item) || item["product_type"] !== "story")
                            );
                        }));
                    }
                } else if(["xdt_api__v1__clips__home__connection_v2", "xdt_api__v1__feed__timeline__connection"].includes(property)) {
                    // - posts in personal feed *that are followed* (i.e. not suggested; e.g. https://instagram.com)
                    // - posts on 'Reels' page (e.g. https://www.instagram.com/reels/)
                    edges.push(...obj[property]["edges"].filter(edge => "node" in edge).map(edge => edge["node"]).filter(node => {
                        return "media" in node
                            && node["media"] !== null
                            && "id" in node["media"]
                            && "user" in node["media"]
                            && !!node["media"]["user"];
                    }).map(node => node["media"]));
                } else if(property === "items") {
                    // - posts on 'reels' page for a user (e.g. https://www.instagram.com/steveo/reels/)
                    edges.push(...obj[property].filter(node => "media" in node).map(node => node["media"]).filter(node => {
                        return "id" in node
                    }));
                } else if(typeof(obj[property]) === "object") {
                    traverse(obj[property]);
                }
            }
        }

        traverse(data);

        return edges;
    }
);