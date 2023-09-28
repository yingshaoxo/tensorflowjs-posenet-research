const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin')

module.exports = {
    entry: [
        "./src/video_index.js"
    ],
    plugins: [
        new CopyWebpackPlugin([
            {from: 'face_models', to: 'face_models'}, 
            {from: 'age_models', to: 'age_models'}, 

            {from: 'posenet_weights', to: 'posenet_weights'}, 

            {from: 'standing_or_sitting_models', to: 'standing_or_sitting_models'},
            {from: 'front_or_side_models', to: 'front_or_side_models'},
            {from: 'are_they_looking_their_hands_models', to: 'are_they_looking_their_hands_models'},

            {from: 'object_detect_models', to: 'object_detect_models'},

            {from: 'src/demo.mp4', to: 'demo.mp4'},
        ]),
        new HtmlWebpackPlugin({
            template: './src/index.html'
        })
    ]
}
