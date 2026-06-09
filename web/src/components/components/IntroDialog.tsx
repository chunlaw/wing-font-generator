import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from "@mui/material";

interface IntroDialogProps {
  open: boolean;
  onClose: () => void;
}

const IntroDialog = ({ open, onClose }: IntroDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        介紹
        <Divider />
      </DialogTitle>
      <DialogContent>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            有咩用？
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body1"
              fontFamily="ChironSungHK-Noto-lshk"
              fontSize={24}
            >
              中文字可以加語言學會拼音，可以用反切，會唔會可以用平假名添？推而廣之，圍頭話，潮洲話，台語，福建話、上海話都可以做埋﹗
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            實際上邊個會用？
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body1"
              fontFamily="ChironSungHK-Noto-lshk"
              fontSize={24}
            >
              我地已經做到 woff 字體畀網頁使用，普羅大眾只需要用瀏覽器打開 IT
              友做既網站就睇到，睇歌詞可以跟著唱，睇詩可以一齊讀。教倉頡打字，教移民港孩都方便啲啲。
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            點解免費？
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body1"
              fontFamily="ChironSungHK-Noto-lshk"
              fontSize={24}
            >
              若我能說萬國的方言，但時間有限，一齊參與，一齊為語言為文字努力，我相信社會一定會更好﹗
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            開源又有咩好處？
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body1"
              fontFamily="ChironSungHK-Noto-lshk"
              fontSize={24}
            >
              設計師想加拼音，但又想用自己字體，就可以用我地既軟件自己合成字體。仲有好多字體本身有版權，我地無辦法拎返來合成畀出來，佢就可以自己搞，開開心心﹗
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            點幫手？
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body1"
              fontFamily="ChironSungHK-Noto-lshk"
              fontSize={24}
            >
              暫時最缺係詞典，同埋要知多音字預設點讀最好，可以加入{" "}
              <a href="https://t.me/wingfont" target="_blank">
                TG 群
              </a>
              傾。
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            可以幫手寫 code？
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body1"
              fontFamily="ChironSungHK-Noto-lshk"
              fontSize={24}
            >
              無任歡迎，相信識寫 code 既你會搵到 Github link。
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            想幫手設計？
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body1"
              fontFamily="ChironSungHK-Noto-lshk"
              fontSize={24}
            >
              依家字體擺位未必好突出，歡迎加入{" "}
              <a href="https://t.me/wingfont" target="_blank">
                TG 群
              </a>
              詳細分享下應該用咩字體，比例又應該係點。
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            想表達支持？
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body1"
              fontFamily="ChironSungHK-Noto-lshk"
              fontSize={24}
            >
              多謝先，話說我都有做巴士 app 。或者你可以試埋{" "}
              <a href="https://hkbus.app">hkbus.app</a>。
            </Typography>
          </AccordionDetails>
        </Accordion>
      </DialogContent>
    </Dialog>
  );
};

export default IntroDialog;
