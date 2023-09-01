"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRedditPost = void 0;
function parseRedditPost(record) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    var metadata = record.data.children[0].data;
    var resolution = undefined;
    var post_hint = metadata.post_hint;
    var video_url = (_b = (_a = metadata.secure_media) === null || _a === void 0 ? void 0 : _a.reddit_video) === null || _b === void 0 ? void 0 : _b.fallback_url;
    var has_audio = true;
    if ((_c = metadata === null || metadata === void 0 ? void 0 : metadata.media) === null || _c === void 0 ? void 0 : _c.reddit_video) {
        resolution = { width: metadata.media.reddit_video.width, height: metadata.media.reddit_video.height };
        video_url = metadata.media.reddit_video.fallback_url;
        has_audio = metadata.media.reddit_video.has_audio;
        post_hint = 'hosted:video';
    }
    else if ((_e = (_d = metadata === null || metadata === void 0 ? void 0 : metadata.preview) === null || _d === void 0 ? void 0 : _d.images) === null || _e === void 0 ? void 0 : _e.length) {
        if (metadata.preview.images[0].source) {
            resolution = metadata.preview.images[0].source;
        }
        else {
            var resolutions = (_g = (_f = metadata.preview) === null || _f === void 0 ? void 0 : _f.images) === null || _g === void 0 ? void 0 : _g[0].resolutions;
            resolution = resolutions === null || resolutions === void 0 ? void 0 : resolutions[(resolutions === null || resolutions === void 0 ? void 0 : resolutions.length) - 1];
        }
    }
    else if ((metadata === null || metadata === void 0 ? void 0 : metadata.thumbnail_width) && (metadata === null || metadata === void 0 ? void 0 : metadata.thumbnail_height)) {
        resolution = { width: metadata.thumbnail_width, height: metadata.thumbnail_height };
    }
    var media_metadata = [];
    if (metadata.media_metadata && ((_h = metadata.gallery_data) === null || _h === void 0 ? void 0 : _h.items)) {
        for (var _i = 0, _r = metadata.gallery_data.items; _i < _r.length; _i++) {
            var _s = _r[_i], media_id = _s.media_id, caption = _s.caption;
            var value = metadata.media_metadata[media_id];
            media_metadata.push({
                width: value.s.x,
                height: value.s.y,
                url: value.s.u,
                caption: caption,
            });
        }
    }
    else if (metadata.media_metadata) {
        for (var _t = 0, _u = Object.values(metadata.media_metadata); _t < _u.length; _t++) {
            var _v = _u[_t].s, x = _v.x, y = _v.y, u = _v.u;
            if (!x || !y || !u)
                continue;
            media_metadata.push({
                width: x,
                height: y,
                url: u,
            });
        }
    }
    return {
        kind: record.kind,
        subreddit: metadata.subreddit,
        title: metadata.title,
        post_hint: post_hint,
        url: metadata.url,
        permalink: metadata.permalink,
        description: (_k = (_j = metadata.selftext) === null || _j === void 0 ? void 0 : _j.replace(/^&amp;#x200B;/, '')) === null || _k === void 0 ? void 0 : _k.trim(),
        is_reddit_media: metadata.is_reddit_media_domain,
        preview_image_url: (_p = (_o = (_m = (_l = metadata.preview) === null || _l === void 0 ? void 0 : _l.images) === null || _m === void 0 ? void 0 : _m[0].source) === null || _o === void 0 ? void 0 : _o.url) !== null && _p !== void 0 ? _p : metadata.thumbnail,
        resolution: resolution ? { width: resolution.width, height: resolution.height } : undefined,
        video_url: video_url,
        video_has_audio: has_audio,
        oembed: (_q = metadata.media) === null || _q === void 0 ? void 0 : _q.oembed,
        domain: metadata.domain,
        secure_media_embed: metadata.secure_media_embed,
        media_metadata: media_metadata,
    };
}
exports.parseRedditPost = parseRedditPost;
