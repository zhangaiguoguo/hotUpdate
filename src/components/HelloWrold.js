import * as json from "../data/json.json";
import * as bg from "../images/wave.gif";
import icoImg from "../images/favicon.ico";
import svgImg from "../images/inSampling2.svg"

export default {
  template: `

        <div>
            hello world
            <button @click="num++">点击 {{num}}</button>
            <div>
              {{json}}
            </div>
            <img :src="bg.default" width=200 height=200/>
            <img :src="icoImg"/>
            <div v-html="svgImg"></div>
        </div>

    `,
  data() {
    return {
      num: 1,
      json: json.default,
      bg,
      icoImg,svgImg
    };
  },
};
