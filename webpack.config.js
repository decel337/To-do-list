const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
    entry: './lab3/front/index.js',
    output: {
        filename: 'bundle.[hash].js',
        path: path.resolve(__dirname, './dist'),
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './lab3/front/index.html',
        }),
        new Dotenv({
            systemvars: true,
        }),
    ],
    resolve: {
        modules: [__dirname, 'src', 'node_modules'],
        extensions: ['*', '.js', '.jsx', '.tsx', '.ts'],
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                exclude: /node_modules/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            url: false,
                        },
                    },
                ],
            },
            {
                test: /.png|svg|jpg|gif$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            publicPath: path.resolve(__dirname, '/'),
                            outputPath: '/',
                            name: '[name].[ext]',
                            useRelativePaths: true,
                        },
                    },
                ],
            },
        ],
    },
};
