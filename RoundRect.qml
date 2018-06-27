import QtQuick 2.0

Rectangle {
    width:childrenRect.width
    height:childrenRect.height
    border.color: "black"
    radius: 10
    property real pw:parent.width
    property real ph:parent.height
    signal clicked(real mouseX,real mouseY)
    MouseArea
    {
        anchors.fill: parent
        onClicked: parent.clicked(mouseX,mouseY)
    }
}
