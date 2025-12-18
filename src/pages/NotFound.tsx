import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md border-none shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <CardTitle className="text-3xl font-bold">404</CardTitle>
          <CardDescription className="text-lg">
            Página não encontrada
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>
            Desculpe, a página que você está procurando não existe ou foi
            movida.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center pt-2">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/">Voltar para o Início</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
