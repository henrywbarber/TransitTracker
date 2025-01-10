import React from 'react';
import { Pressable, StyleSheet, View, Image, Text } from 'react-native';
import { useNavigation } from "@react-navigation/native";

export default function TransitTrainCard(props) {
    const navigation = useNavigation();
    console.log(props);

    return (
        // <Pressable onPress={() => navigation.navigate("Article", { fullArticleId: props.fullArticleId, title: props.title, img: props.img, posted: props.posted })}>
        //     <View style={styles.card}>
        //         <Image source={{ uri: `https://raw.githubusercontent.com/CS571-S24/hw8-api-static-content/main/${props.img}` }} style={styles.image} />
        //         <Text style={{ fontSize: 28 }}>{props.title}</Text>
        //     </View>
        // </Pressable>
        <Pressable onPress={() => Alert.alert("TODO pressable")}>
            <View style={styles.card}>
                <Text style={{ fontSize: 28 }}>{props.title}</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        margin: 10,
        padding: 20,
        elevation: 5,
        borderRadius: 10,
        backgroundColor: 'white',
        shadowOffset: {
            width: 4,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    }
});
