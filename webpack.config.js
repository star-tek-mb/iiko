const { join } = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const { HotModuleReplacementPlugin } = require('webpack');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const DotenvPlugin = require('dotenv-webpack');

module.exports = {
    entry: {
        admin: join(__dirname, 'site/admin/index.js'),
        front: join(__dirname, 'site/front/index.js'),
    },
    output: {
        path: join(__dirname, 'dist'),
        filename: '[name].bundle.js',
        chunkFilename: '[id].js',
        publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                options: {
                    presets: [["@babel/preset-env", {
                        targets: "last 2 versions",
                        useBuiltIns: 'entry',
                        corejs: 3,
                        exclude: ['@babel/plugin-transform-regenerator']
                    }]]
                }
            }, {
                test: /.vue$/,
                loader: 'vue-loader'
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader'
                ]
            }
        ]
    },
    watchOptions: {
        poll: 1000,
        ignored: ['node_modules']
    },
    plugins: [
        new DotenvPlugin(),
        new HotModuleReplacementPlugin(),
        new VueLoaderPlugin(),
        new HTMLWebpackPlugin({
            template: join(__dirname, 'site/front/index.html'),
            filename: 'front.html',
            inject: 'body',
            chunks: ['front']
        }),
        new HTMLWebpackPlugin({
            template: join(__dirname, 'site/admin/index.html'),
            filename: 'admin.html',
            inject: 'body',
            chunks: ['admin']
        }),
        new MiniCssExtractPlugin(),
        new CleanWebpackPlugin({
            cleanAfterEveryBuildPatterns: ['!*.html']
        })
    ]
};